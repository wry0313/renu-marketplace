import {
  Text,
  View,
  Dimensions,
  Animated,
  Pressable,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChatGroup, Measure, RefAndKey } from "../../../../shared/types";
import Colors from "../../../../shared/constants/Colors";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useSession } from "../../../hooks/useSession";
import { IMAGES_URL, getChatGroups } from "../../../../shared/api";
import { FlashList } from "@shopify/flash-list";
import RefreshScreen from "../../../components/RefreshScreen";
import PagerView from "react-native-pager-view";

const TABS = ["Buy", "Sell"];
const data = TABS.map((i) => ({
  key: i,
  ref: React.createRef(),
}));

export default function MessagePage() {
  const queryClient = useQueryClient();
  const chats = queryClient.getQueryData<ChatGroup[]>(["chats", TABS[0]], {
    exact: true,
  });
  const pagerViewRef = React.useRef<PagerView>(null);
  const [selectedTabInt, setSelectedTabInt] = React.useState(0);

  return (
    <View className="bg-bgLight h-full">
      <Text className="m-2.5 mt-2 font-Poppins_600SemiBold text-xl ">
        Messages
      </Text>
      <Tabs
        data={data}
        selectedTabInt={selectedTabInt}
        chats={chats}
        pagerViewRef={pagerViewRef}
      />
      <PagerView
        onPageSelected={(e) => {
          const idx = e.nativeEvent.position;
          setSelectedTabInt(idx);
        }}
        className="flex-1"
        initialPage={0}
        orientation="horizontal"
        ref={pagerViewRef}
      >
        {data.map((_, index) => (
          <TabPage index={index} key={index} />
        ))}
      </PagerView>
    </View>
  );
}

function TabPage({ index }: { index: number }) {
  const { session } = useSession();

  const [refreshing, setRefreshing] = React.useState(false);

  const queryClient = useQueryClient();
  const {
    data: chats,
    isError: isErrorChats,
    isLoading: isLoadingChats,
    refetch,
  } = useQuery({
    queryFn: () => getChatGroups(session!.token, !index ? "buyer" : "seller"),
    queryKey: ["chats", TABS[index]],
    enabled: !!session,
  });

  return (
    <View className="bg-bgLight h-full">
      {isErrorChats ? (
        <RefreshScreen displayText="Something went wrong." refetch={refetch} />
      ) : isLoadingChats ? (
        <></>
      ) : chats.length === 0 ? (
        <RefreshScreen displayText="No messages yet." refetch={refetch} />
      ) : (
        <FlashList
          data={chats}
          renderItem={({ item }) => <ChatRow item={item} />}
          keyExtractor={(item) => item.chat_id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refetch();
                await queryClient.invalidateQueries(["unreadCount"]);
                setRefreshing(false);
              }}
            />
          }
          estimatedItemSize={160}
        />
      )}
    </View>
  );
}

const ChatRow = ({ item: chat }: { item: ChatGroup }) => {
  const width = (Dimensions.get("window").width - 230) / 2;
  const param = useLocalSearchParams();
  const selectedTabInt = parseInt(param.tab as string);

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: `/chat/${chat.item_id}`,
          params: {
            chatIdParam: chat.chat_id,
            sellOrBuy: TABS[selectedTabInt],
            otherUserName: chat.other_user_name,
            unreadCount: chat.unread_count,
          },
        });
      }}
      className={`flex flex-row py-4 px-4  bg-bgLight border-b border-b-grayPrimary ${
        chat.item_status === "inactive" ? "opacity-70" : ""
      }`}
    >
      <View className="relative">
        <Image
          transition={{
            effect: "cross-dissolve",
            duration: 50,
          }}
          source={{ uri: `${IMAGES_URL}${chat.item_images[0]}` }}
          className="object-cover rounded-sm"
          style={{
            width: width,
            maxWidth: width,
            height: (width * 4) / 3,
            backgroundColor: Colors.grayLight,
          }}
        />
        {chat.unread_count > 0 && (
          <View className="flex items-center rounded-full justify-center h-6 w-6 absolute bg-purplePrimary -right-2 -top-2">
            <Text className="text-white font-Manrope_600SemiBold">
              {chat.unread_count}
            </Text>
          </View>
        )}
      </View>
      <View className="flex flex-col px-4 flex-grow justify-between ">
        <View>
          <View className="flex flex-row gap-y-1 justify-between max-w-[250px]">
            <Text className="font-Manrope_600SemiBold text-base max-h-[50px]">
              {chat.item_name}
            </Text>
          </View>
          {chat.last_message_content && (
            <Text className="text-base text-gray-600 font-Manrope_500Medium max-w-[250px]">
              {chat.last_message_content.length >= 50 ? (
                <>{chat.last_message_content.slice(0, 50)}...</>
              ) : (
                chat.last_message_content
              )}
            </Text>
          )}
        </View>
        <View className="flex flex-col">
          <Text className="font-Manrope_500Medium text-xs">
            {chat.other_user_name}
            {"    "}
            {dayjs(chat.last_message_sent_at).fromNow()}
          </Text>
          <Text className="font-Manrope_600SemiBold text-sm text-purplePrimary">
            {chat.item_status === "inactive"
              ? "Item is no longer available."
              : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const Tab = React.forwardRef(
  (
    {
      index,
      selectedTabInt,
      unreadCount,
      pagerViewRef,
    }: {
      index: number;
      selectedTabInt: number;
      unreadCount: number;
      pagerViewRef: React.RefObject<PagerView>;
    },
    ref: any
  ) => {
    return (
      <Pressable
        key={index}
        onPress={() => {
          pagerViewRef.current?.setPage(index);
        }}
        className="w-[50%] justify-center items-center"
        ref={ref}
      >
        <Text
          className={`ml-2.5 mt-2 font-Poppins_600SemiBold text-base font-semibold leading-7 ${
            selectedTabInt === index
              ? "text-blackPrimary border-b-grayLight"
              : "text-grayPrimary"
          }`}
        >
          {TABS[index]}{" "}
          <Text className="font-Poppins_500Medium text-sm">
            ({unreadCount})
          </Text>
        </Text>
      </Pressable>
    );
  }
);

const Tabs = ({
  data,
  selectedTabInt,
  chats,
  pagerViewRef,
}: {
  data: RefAndKey[];
  selectedTabInt: number;
  chats: ChatGroup[] | undefined;
  pagerViewRef: React.RefObject<PagerView>;
}) => {
  const [measures, setMeasures] = React.useState<Measure[]>([]);
  const containerRef = React.useRef<any>();
  React.useEffect(() => {
    let m: Measure[] = [];
    data.forEach((item) => {
      item.ref.current.measureLayout(
        containerRef.current,
        (x: number, y: number, width: number, height: number) => {
          m.push({
            x,
            y,
            width,
            height,
          });
          if (m.length === data.length) {
            setMeasures(m);
          }
        }
      );
    });
  }, [containerRef.current]);

  const animatedValueX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (measures[selectedTabInt]) {
      Animated.parallel([
        Animated.timing(animatedValueX, {
          toValue: measures[selectedTabInt].x,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedTabInt, measures]);
  const queryClient = useQueryClient();
  const unreadCount = queryClient.getQueryData<number>(["unreadCount"], {
    exact: true,
  });
  const currentUnreadCount =
    chats?.filter((c) => c.unread_count > 0).length ?? 0;
  return (
    <View
      ref={containerRef}
      className="flex flex-row  w-screen justify-center items-center border-b border-b-grayLight"
    >
      {data.map((section, index) => {
        return (
          <Tab
            pagerViewRef={pagerViewRef}
            key={section.key}
            index={index}
            ref={section.ref}
            selectedTabInt={selectedTabInt}
            unreadCount={
              index === selectedTabInt
                ? currentUnreadCount ?? 0
                : Math.max(0, (unreadCount ?? 0) - currentUnreadCount)
            }
          />
        );
      })}

      {measures.length > 0 && (
        <Indicator animatedValueX={animatedValueX} measures={measures} />
      )}
    </View>
  );
};

const Indicator = ({
  animatedValueX,
  measures,
}: {
  animatedValueX: Animated.Value;
  measures: Measure[];
}) => {
  const translateX = animatedValueX.interpolate({
    inputRange: measures.map((item) => item.x),
    outputRange: measures.map(
      (item) => item.x - (Dimensions.get("window").width / 2 - item.width / 2)
    ),
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        height: 2,
        width: Dimensions.get("window").width / 2,
        backgroundColor: Colors.blackPrimary,
        transform: [{ translateX }],
        bottom: -1,
      }}
    />
  );
};
