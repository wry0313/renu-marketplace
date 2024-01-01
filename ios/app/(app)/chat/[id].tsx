import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChatGroup, ChatMessage } from "../../../../shared/types";
import { Image } from "expo-image";
import { TextInput } from "react-native-gesture-handler";
import useWebSocket from "react-use-websocket";
import { FlashList } from "@shopify/flash-list";
import { useSession } from "../../../hooks/useSession";
import {
  IMAGES_URL,
  getChatIdFromItemId,
  getChatMessages,
  getItem,
  postChatRoomWithFirstMessage,
} from "../../../../shared/api";


export default function ChatScreen() {
  const router = useRouter();
  const {
    id: itemId,
    chatIdParam,
    sellOrBuy,
    newChat,
    otherUserName,
    showEncourageMessage,
    unreadCount,
  } = useLocalSearchParams();
  console.log("chat id param: ", chatIdParam);
  // console.log("sell or buy: ", sellOrBuy);

  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: chatId, isError: isErrorChatId } = useQuery({
    queryFn: async () => getChatIdFromItemId(session!.token, itemId as string),
    queryKey: ["chat_id", itemId, chatIdParam], // it is IMPORTANT to include chatIdParam in the query key because in the seller page there can be multiple chats with the same item id. When seller click the chat it will have the chat id param and this query will not run
    enabled: !!itemId && !chatIdParam && !!session && !newChat, // run the query if there is no chat id param and is not a new chat
    initialData: chatIdParam ? parseInt(chatIdParam as string) : null,
    onSettled: (data) => {
      console.log("chat id query settled");
    },
  });

  console.log("chat id: ", chatId);

  // console.log("Chat id: ", chatId);

  const { data: item, isError: isErrorData } = useQuery({
    queryFn: () => getItem(itemId as string),
    queryKey: ["item", itemId],
    enabled: !!itemId,
  });

  const LIMIT = 25;

  const [extraOffset, setExtraOffset] = React.useState(0);

  const {
    data: chatMessages,
    isLoading: isLoadingChatMessages,
    isError: isErrorChatMessages,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryFn: async ({ pageParam = 0 }) => {
      console.debug("getting messages", pageParam);
      return getChatMessages(pageParam, chatId!, session!.token);
    },
    queryKey: ["messages", chatId],
    enabled: !!chatId && !!session,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0
        ? (allPages.length - 1) * LIMIT + lastPage.length + extraOffset
        : undefined,
  });

  const width = Dimensions.get("window").width / 7;
  const [inputText, setInputText] = React.useState("");

  const { sendMessage } = useWebSocket("wss://api.gavinwang.dev/ws", {
    queryParams: {
      authorization: `Bearer_${session?.token}`,
    },
    shouldReconnect: () => true,
    onOpen: () => {
      if (chatId) {
        sendMessage(`/join ${chatId}`);
      }
    },
    reconnectInterval: 5,
    onMessage: (e) => {
      console.debug(e.data);
      if ((e.data as string).endsWith("receive success")) {
        console.debug("message sent successfully and invalidating");
        // remove receive success from the end of the message
        const messageContent = (e.data as string).slice(0, -15);
        optimisticAddMessage(messageContent, 0);
        optimisticallyUpdateChatGroupData(messageContent);
        setExtraOffset((prev) => prev + 1);
      }
      if ((e.data as string).endsWith("send success")) {
        setLastMessageSentSuccessfully(true);
        setExtraOffset((prev) => prev + 1);
      }
    },
  });

  const nanoidNumber = React.useMemo(
    () => customAlphabet("0123456789", 10),
    []
  );

  const optimisticAddMessage = (content: string, from_me: number) => {
    queryClient.setQueryData<InfiniteData<ChatMessage[]>>(
      ["messages", chatId],
      (oldData) => {
        console.debug("optimistically updating messages");
        if (!oldData) {
          return;
        }
        const newData = oldData.pages.map((page) =>
          page.map((message) => message)
        );
        newData[0].unshift({
          id: Number(nanoidNumber()),
          content,
          from_me,
          sent_at: new Date().toISOString(),
        });
        return {
          ...oldData,
          pages: newData,
        };
      }
    );
  };

  React.useEffect(() => {
    if (!chatId) {
      return;
    }
    console.log("setting unread to zero");
    optimisticallyUpdateChatGroupUnreadCount();
  }, []);

  const optimisticallyUpdateChatGroupUnreadCount = () => {
    if (unreadCount && Number(unreadCount) === 0) {
      console.debug("unread count is zero so no need to update");
      return;
    }
    queryClient.setQueryData<ChatGroup[]>(["chats", sellOrBuy], (oldData) => {
      if (!oldData) {
        return;
      }
      console.debug("optimistically updating chat group unread count to zero");
      const newData = oldData.map((chatGroup) => {
        if (chatGroup.chat_id === chatId) {
          return {
            ...chatGroup,
            unread_count: 0,
          };
        }
        return chatGroup;
      });
      return newData;
    });
    queryClient.setQueryData<number>(["unreadCount"], (old) =>
      old ? old - 1 : 0
    );
  };

  const optimisticallyUpdateChatGroupData = (messageContent: string) => {
    queryClient.setQueryData<ChatGroup[]>(["chats", sellOrBuy], (oldData) => {
      console.debug("optimistically updating chat group data");
      if (!oldData) {
        return;
      }
      const newData = oldData.map((chatGroup) => {
        if (chatGroup.chat_id === chatId) {
          return {
            ...chatGroup,
            last_message_content: messageContent,
            last_message_sent_at: new Date(),
          };
        }
        return chatGroup;
      });
      return newData;
    });
  };

  const [creatingChatRoom, setCreatingChatRoom] = React.useState(false);

  const createChatRoomAndFirstMessageMutation = useMutation({
    mutationFn: (firstMessage: string) =>
      postChatRoomWithFirstMessage(
        session!.token,
        firstMessage,
        itemId as string
      ),
    onMutate: () => {
      setCreatingChatRoom(true);
    },
    // onSettled: () => {
    //   setCreatingChatRoom(false);
    // },
    onError: (err) => {
      console.error(err);
    },
    onSuccess: (data) => {
      console.log("first message sent successfully, chat id: ", data);
      sendMessage(`/join ${data}`);
      setLastMessageSentSuccessfully(true);
      queryClient.setQueryData(["chat_id", itemId], data);
      queryClient.invalidateQueries(["chats", sellOrBuy]);
    },
  });

  const chatMessagesData = React.useMemo(() => {
    if (!chatMessages?.pages) {
      console.debug("no messages");
      return [];
    }
    console.debug("PROCESSING mESSAGES DATE");
    let lastDisplayString = "";
    const curTime = new Date();
    const messages = chatMessages.pages.flatMap((page) =>
      page.map((message) => {
        return { ...message };
      })
    );
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (!message.sent_at) {
        continue;
      }
      const sentAtDate = new Date(message.sent_at);
      const timeDiffFromCur = curTime.getTime() - sentAtDate.getTime();

      const dispayTime: boolean = timeDiffFromCur < 1000 * 60 * 60 * 24; // less than an hour
      const displayExactTime: boolean = timeDiffFromCur > 1000 * 60 * 60 * 24; // more than a day

      let sentAtString;

      if (dispayTime) {
        sentAtString = dayjs(message.sent_at).format("h:mm A");
      } else if (displayExactTime) {
        sentAtString = dayjs(message.sent_at).format("MMM D, h:mm A");
      } else {
        message.sent_at = null;
        continue;
      }

      if (sentAtString === lastDisplayString) {
        message.sent_at = null;
        continue;
      }

      message.sent_at = sentAtString;
      lastDisplayString = sentAtString;
    }
    return messages;
  }, [chatMessages?.pages]);

  const nanoid = React.useMemo(
    () => customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10),
    []
  );
  const [lastMessageSentSuccessfully, setLastMessageSentSuccessfully] =
    React.useState(false);

  return (
    <SafeAreaView className="bg-bgLight">
      <View className="bg-bgLight h-full">
        <View className="flex flex-row items-center justify-between ">
          <Pressable onPress={router.back} className="w-10 p-3">
            <LeftChevron />
          </Pressable>
          {otherUserName && (
            <Text className="font-Poppins_600SemiBold text-base text-blackPrimary ">
              {otherUserName}
            </Text>
          )}
          <View className="w-10 p-3" />
        </View>

        <View className="border-y border-y-stone-200">
          <Pressable
            onPress={() => {
              if (!item) return;
              router.push({
                pathname: `/item/${item.id}`,
                params: {
                  itemString: JSON.stringify(item),
                },
              });
            }}
            className="p-3.5 flex-row justify-between items-center bg-stone-50"
            style={{
              height: (width * 4) / 3 + 28,
              opacity: item?.status === "inactive" ? 0.75 : 1,
            }}
          >
            {item && (
              <Image
                transition={{
                  effect: "cross-dissolve",
                  duration: 250,
                }}
                source={{ uri: `${IMAGES_URL}${item.images[0]}` }}
                className="object-cover rounded-sm"
                style={{
                  minWidth: width,
                  minHeight: (width * 4) / 3,
                  width: width,
                  height: (width * 4) / 3,
                  backgroundColor: Colors.grayLight,
                }}
              />
            )}
            <View className="mx-4 flex flex-grow flex-col pt-3">
              {item && (
                <>
                  <Text className="font-Poppins_600SemiBold text-base text-blackPrimary max-w-[230px] max-h-[60px]">
                    {item.name}
                  </Text>
                  <Text className="font-Manrope_400Regular text-sm max-w-[230px] text-blackPrimary" style={{
                    maxHeight: item.status === "inactive" ? 20 : 40
                  }}>
                    {!(item.description && item.description.trim())
                      ? "No description provided."
                      : item.description.trim()}
                  </Text>
                  <Text className="font-Manrope_600SemiBold text-sm text-purplePrimary">
                    {item.status === "inactive"
                      ? "Item is no longer available."
                      : ""}
                  </Text>
                </>
              )}
            </View>
            <Text className="font-Poppins_600SemiBold text-base text-blackPrimary">
              {item && `$${item.price}`}
            </Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={64}
        >
          {chatMessagesData.length === 0 && showEncourageMessage === "true" ? (
            <View className="flex-grow flex flex-col justify-center items-center w-full">
              <View className="flex flex-row items-center justify-center">
                <Text className="font-Manrope_500Medium text-gray-500">
                  {creatingChatRoom
                    ? "creating chat room"
                    : "start by sending some messages to seller."}
                </Text>
                {creatingChatRoom && (
                  <ActivityIndicator size="small" className="ml-2" />
                )}
              </View>
            </View>
          ) : (
            <>
              <FlashList
                data={chatMessagesData}
                renderItem={Message}
                keyExtractor={(item, index) => item.id.toString()}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
                inverted
                estimatedItemSize={50}
                onEndReached={() => {
                  if (!hasNextPage) {
                    console.debug("no next page");
                    return;
                  }
                  console.debug("refetching messages");
                  if (!chatId) {
                    console.log("chat id is null");
                    return;
                  }
                  fetchNextPage();
                }}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  padding: 10,
                }}
              />
              {lastMessageSentSuccessfully ? (
                <View className="flex w-full -mt-5 flex-row items-center justify-end pr-2 py-1">
                  <Text className="font-Manrope_500Medium text-gray-500 text-xs">
                    delivered
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <View className="flex flex-row w-full px-2">
            <TextInput
              placeholder="Message"
              className="px-4 py-2 border rounded-full border-gray-400 flex-grow"
              value={inputText}
              onChangeText={setInputText}
              blurOnSubmit={false}
              onSubmitEditing={async () => {
                if (!inputText.trim()) return;
                if (!chatId) {
                  console.debug("no chat id so create one");
                  createChatRoomAndFirstMessageMutation.mutateAsync(inputText);
                  registerForPushNotificationsAsync();
                  setInputText("");
                } else {
                  const correlationId = nanoid();
                  console.debug(
                    "sending message with correlation id",
                    correlationId
                  );
                  sendMessage(
                    `/message ${chatId} ${correlationId} ${inputText}`
                  );
                  setLastMessageSentSuccessfully(false);
                  console.debug("optimistically updating messages");
                  optimisticAddMessage(inputText, 1);
                  optimisticallyUpdateChatGroupData(inputText);
                  registerForPushNotificationsAsync();
                  setInputText("");
                }
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import LeftChevron from "../../../components/LeftChevron";
import { customAlphabet } from "nanoid/non-secure";
import Colors from "../../../../shared/constants/Colors";
import { registerForPushNotificationsAsync } from "../../../notification";
dayjs.extend(relativeTime);
const Message = ({ item: message }: { item: ChatMessage }) => {
  return (
    <View className="flex flex-col items-center">
      {message.sent_at !== null ? (
        <Text className="mt-3 mb-1 mr-2 text-sm font-Manrope_500Medium text-grayPrimary">
          {message.sent_at}
        </Text>
      ) : null}

      <View
        className={`flex flex-row items-center ${
          message.from_me ? "ml-auto" : "mr-auto"
        }`}
      >
        <View
          className={`flex flex-row rounded-xl p-2 w-fit my-1.5 ${
            message.from_me
              ? " bg-purplePrimary"
              : " bg-grayLight border border-stone-300"
          }`}
        >
          <Text
            className={`font-Manrope_500Medium text-[15.5px] ${
              message.from_me ? "text-white" : "text-black"
            }`}
          >
            {/* {message.id} */}
            {message.content}
          </Text>
        </View>
      </View>
    </View>
  );
};
