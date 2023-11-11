import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Dimensions,
  KeyboardAvoidingView,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Colors from "../../../constants/Colors";
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiResponse } from "../../../types/api";
import {
  ChatId,
  ChatMessage,
  ItemWithImage,
  UserWithCount,
} from "../../../types/types";
import { useSession } from "../../../providers/ctx";
import { Image } from "expo-image";
import { TextInput } from "react-native-gesture-handler";
import useWebSocket from "react-use-websocket";
import { FlashList } from "@shopify/flash-list";

export default function ChatScreen() {
  const router = useRouter();
  const { id: itemId, chatIdParam } = useLocalSearchParams();

  const { session } = useSession();

  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);

  const [chatId, setChatId] = React.useState<number | undefined>(undefined);

  useEffect(() => {
    if (chatIdParam) {
      setChatId(parseInt(chatIdParam as string));
      console.log("set chat id to param", chatIdParam);
    }
  }, [chatIdParam]);

  const { isError: isErrorChatId } = useQuery({
    queryFn: async () =>
      fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/chats/id/${itemId}`, {
        headers: {
          authorization: `Bearer ${session?.token}`,
        },
      }).then((x) => {
        console.log("fetching chat id because not given in param");
        return x.json();
      }) as Promise<ApiResponse<ChatId>>,
    queryKey: ["chat_item", itemId],
    enabled: !!itemId && !chatIdParam,
    onSuccess(data) {
      if (data.status === "success") {
        if (data.data.chat_id) {
          setChatId(data.data.chat_id);
        } else {
          console.log("new chat as this chat doesn't exist")
        }
      } else {
        console.error("get chat id error", data);
      }
    },
    onError(err) {
      console.error("error getting chat id", err);
    }
  });

  const [item, setItem] = React.useState<ItemWithImage>();
  useQuery({
    queryFn: async () =>
      fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/items/${itemId}`).then(
        (x) => x.json()
      ) as Promise<ApiResponse<ItemWithImage>>,
    queryKey: ["item", itemId],
    enabled: !!itemId,
    onSuccess(data) {
      if (data.status === "success") {
        setItem(data.data);
      } else {
        console.error(data);
      }
    },
    onError(err) {
      console.error("error getting item", err);
    }
  });

  const [seller, setSeller] = React.useState<UserWithCount>();

  useQuery({
    queryFn: async () =>
      fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/users/${item?.user_id}`
      ).then((x) => x.json()) as Promise<ApiResponse<UserWithCount>>,
    queryKey: ["user", item?.user_id],
    enabled: !!item && !!item.user_id,
    onSuccess(data) {
      if (data.status === "success") {
        setSeller(data.data);
      } else {
        console.error(data);
      }
    },
    onError(err) {
      console.error("error getting user", err);
    }
  });

  const [offset, setOffset] = React.useState(0);
  const limit = 25;
  const [endReached, setEndReached] = React.useState(false);

  const { isError: isErrorChatMessages, refetch } = useQuery({
    queryFn: async () =>
      fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/chats/messages/${chatId}?offset=${offset}&limit=${limit}`,
        {
          headers: {
            authorization: `Bearer ${session?.token}`,
          },
        }
      ).then((x) => x.json()) as Promise<ApiResponse<ChatMessage[]>>,
    queryKey: ["messages", chatId],
    enabled: !!chatId && !endReached && !!session?.token,
    onSuccess(data) {
      if (data.status === "success") {
        console.log("fetched messages", data.data)
        if (data.data.length < limit) {
          console.log("end reached");
          setEndReached(true);
        }
        setChatMessages(prev=>[...prev, ...data.data]);
        console.log("fetching at offet:", offset);
        console.log("fetched messages:", data.data.length)
        setOffset((prev) => prev + limit);
      } else {
        console.error(data);
      }
    },
    onError(err) {
      console.error("error getting messages", err);
    }
  });

  const width = Dimensions.get("window").width / 8;
  const [inputText, setInputText] = React.useState("");

  let socketUrl = "wss://api.gavinwang.dev/ws";
  const {
    sendMessage,
    lastMessage,
  } = useWebSocket(socketUrl, {
    queryParams: {
      authorization: `Bearer_${session?.token}`,
    },
    shouldReconnect: () => true,
    reconnectInterval: 5,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      setChatMessages((prev) => [
        {
          id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
          content: lastMessage.data,
          from_me: 0,
          sent_at: new Date(),
        } as ChatMessage,
        ...prev,
      ]);
      setOffset((prev) => prev + 1);
    }
  }, [lastMessage,]);

  React.useEffect(() => {
    if (!chatId) return;
    sendMessage(`/join ${chatId}`);
  }, [chatId]);

  const queryClient = useQueryClient();

  return (
    <SafeAreaView className="bg-bgLight">
      <View className="bg-bgLight h-full">
        <View className="flex flex-row items-center justify-between ">
          <Pressable onPress={router.back} className="w-10 p-3">
            <CloseIcon />
          </Pressable>
          {seller && (
            <Text className="font-Poppins_600SemiBold text-base text-blackPrimary ">
              {seller.name}
            </Text>
          )}
          <View className="w-10 p-3" />
        </View>

        <Pressable
          onPress={() => router.push(`/item/${item?.id}`)}
          className="p-4 flex-row justify-between  items-center border-y border-y-grayPrimary bg-gray-100"
          style={{
            height: (width * 4) / 3 + 32,
          }}
        >
          {item && (
            <Image
              source={{ uri: item.item_images[0] }}
              className="object-cover rounded-sm"
              style={{
                minWidth: width,
                minHeight: (width * 4) / 3,
                width: width,
                height: (width * 4) / 3,
              }}
            />
          )}
          <View className="mx-4 flex flex-grow flex-col">
            <Text className="font-Poppins_600SemiBold text-base text-blackPrimary">
              {item && item.name}
            </Text>
            <Text className="font-Manrope_400Regular text-sm max-w-[250px] max-h-[40px] text-blackPrimary">
              {item && item.description}
            </Text>
          </View>
          <Text className="font-Poppins_600SemiBold text-base text-blackPrimary">
            ${item && item.price}
          </Text>
        </Pressable>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={64}
        >
          <FlashList
            data={chatMessages}
            renderItem={({ item }) => <Message message={item} />}
            keyExtractor={(item, index) => index.toString()}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            inverted
            estimatedItemSize={offset ? offset : 35}
            onEndReached={() => {
              if (endReached) return;
              refetch();
            }}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              padding: 10,
            }}
          />

          <View>
            <TextInput
              placeholder="Message"
              className="px-4 py-2 mx-2 border rounded-full border-gray-400"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={(e) => {
                if (!inputText) return;
                if (!chatId && item) {
                  console.log("no chat id so create one");
                  fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/chats/${item.id}`, {
                    headers: {
                      authorization: `Bearer ${session?.token}`,
                    },
                    method: "POST",
                  }).then((x) => {
                    x.json().then((data: ApiResponse<ChatId>) => {
                      if (data.status === "success") {
                        setChatId(data.data.chat_id);
                        sendMessage(`/join ${data.data.chat_id}`);
                      } else {
                        console.error(data);
                      }
                    }).catch(err => {
                      console.error("parse post messgae", err)
                    })
                  });
                }
                sendMessage(`/message ${chatId} ${inputText}`);
                setInputText("");
                queryClient.invalidateQueries(["chats", 0]); // todo: improve this cache invalidation logic
                queryClient.invalidateQueries(["chats", 1]);

                setChatMessages((prev) => [
                  {
                    id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
                    content: inputText,
                    from_me: 1,
                    sent_at: new Date(),
                  } as ChatMessage,
                  ...prev,
                ]);
                setOffset((prev) => prev + 1);
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const Message = ({ message }: { message: ChatMessage }) => {
  return (
    <>
      <View
        className={`flex flex-row border border-gray-300 rounded-lg bg-gray-100 p-2 w-fit mb-3 ${
          message.from_me ? "ml-auto" : "mr-auto"
        }`}
      >
        <Text>{message.content}</Text>
      </View>
    </>
  );
};

const CloseIcon = () => (
  <Svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke={Colors.grayPrimary}
    className="w-6 h-6"
  >
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      d="M6 18L18 6M6 6l12 12"
    />
  </Svg>
);
