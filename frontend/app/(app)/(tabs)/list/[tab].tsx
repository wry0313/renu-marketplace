import { Link, router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import Colors from "../../../../constants/Colors";
import { ItemWithImage, Measure, RefAndKey } from "../../../../types/types";
import { useSession } from "../../../../providers/ctx";
import { useQuery } from "@tanstack/react-query";

import { ApiResponse } from "../../../../types/api";
import { Image } from "expo-image";

const TABS = ["Listings", "Sold"];
const STATUS = ["ACTIVE", "INACTIVE"];

const data = TABS.map((i) => ({
  key: i,
  ref: React.createRef(),
}));

export default function ListScreen() {
  const param = useLocalSearchParams();
  const selectedTab = param.tab;
  const selectedTabInt = parseInt(selectedTab as string);
  const tabDisplay = TABS[selectedTabInt];

  const { session } = useSession();

  const [items, setItems] = React.useState<ItemWithImage[]>([]);

  const {
    isError: isErrorItem,
    isLoading: isLoadingItem,
    refetch,
  } = useQuery({
    queryFn: async () =>
      fetch(process.env.EXPO_PUBLIC_BACKEND_URL + "/users/me/items", {
        headers: {
          authorization: `Bearer ${session?.token}`,
        },
      }).then((x) => x.json()) as Promise<ApiResponse<ItemWithImage[]>>,
    queryKey: ["list"],
    enabled: !!session && !!session.token,
    onError(err) {
      console.error("error", err);
    },
    onSuccess(data) {
      console.log(data);
      if (data.status === "success") {
        setItems(data.data);
      } else {
        console.error(data);
      }
    },
  });

  return (
    <View className="bg-bgLight h-full">
      <Text className="ml-2.5 mt-4 font-Poppins_600SemiBold text-xl text-blackPrimary ">
        {tabDisplay}
      </Text>
      <Tabs data={data} selectedTabInt={selectedTabInt} itemData={items} />
      {isErrorItem ? (
        <Text className="mx-auto my-[50%] font-Poppins_600SemiBold text-lg">
          Something wrong happened...
        </Text>
      ) : isLoadingItem ? (
        <></>
      ) : items.filter((item) => item.status === STATUS[selectedTabInt])
          .length === 0 ? (
        <Text className="mx-auto my-[70%] font-Poppins_600SemiBold text-lg">
          No item found.
        </Text>
      ) : (
        <FlatList
          data={items.filter((item) => item.status === STATUS[selectedTabInt])}
          numColumns={1}
          keyExtractor={(item) => item.id.toString()}
          renderItem={(object) => (
            <ListingPageItem
              item={object.item}
              token={session?.token}
              refetch={refetch}
            />
          )}
        />
      )}
    </View>
  );
}

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CATEGORIES } from "../home/[section]";
dayjs.extend(relativeTime);

const ListingPageItem = ({
  item,
  token,
  refetch,
}: {
  item: ItemWithImage;
  token: string | undefined;
  refetch: any;
}) => {
  const width = (Dimensions.get("window").width - 30) / 2;
  const [isSold, setIsSold] = React.useState<boolean>(false);
  return (
    <View className="flex flex-row mt-4 mx-4 bg-bgLight">
      <Image
        source={{ uri: item.item_images[0] }}
        className="object-cover rounded-sm"
        style={{
          width: width,
          maxWidth: width - 50,
          height: ((width - 50) * 4) / 3,
        }}
      />
      <View className="flex flex-col justify-between px-4 pt-2">
        <View className="flex flex-col gap-y-1">
          <Text className="font-Manrope_600SemiBold text-base">
            {item.name}
          </Text>
          <Text className="font-Manrope_400Regular text-sm">
            {dayjs(item.created_at).fromNow()}
          </Text>
          <Text className="font-Manrope_400Regular text-sm">
            {CATEGORIES[item.category].display}{" "}
          </Text>
        </View>
        <Pressable
          onPressIn={() => {
            setIsSold(true);
          }}
          onPressOut={() => {
            setIsSold(false);
          }}
          onPress={() => {
            fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/items/${item.id}`, {
              method: "POST",
              headers: {
                authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
              }),
            }).then(refetch);
          }}
          className={`border-[1.5px] h-[35px] w-[220px] flex items-center justify-center`}
        >
          <Text
            className={`font-SecularOne_400Regular text-sm ${
              isSold ? "text-gray-500" : "text-blackPrimary"
            }`}
          >
            {item.status === "ACTIVE" ? "MARK AS SOLD" : "RELIST"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const Tab = React.forwardRef(
  (
    {
      selectedTabInt,
      sectionIndex,
      data,
    }: {
      selectedTabInt: number;
      sectionIndex: number;
      data: ItemWithImage[];
    },
    ref: any
  ) => {
    return (
      <Pressable
        key={sectionIndex}
        onPress={() => {
          if (selectedTabInt === sectionIndex) {
            return;
          }
          void router.replace(`/list/${sectionIndex}`);
        }}
        className="w-[50%] justify-center items-center"
        ref={ref}
      >
        <View>
          <Text
            className={`ml-2.5 mt-6 font-Poppins_600SemiBold text-base font-semibold leading-7 ${
              sectionIndex === selectedTabInt
                ? "text-blackPrimary border-b border-grayPrimary"
                : "text-grayPrimary"
            }`}
          >
            {TABS[sectionIndex]}{" "}
            <Text className="font-Poppins_500Medium text-sm">
              (
              {
                data.filter((item) => item.status === STATUS[sectionIndex])
                  .length
              }
              )
            </Text>
          </Text>
        </View>
      </Pressable>
    );
  }
);

const Tabs = ({
  data,
  selectedTabInt,
  itemData,
}: {
  data: RefAndKey[];
  selectedTabInt: number;
  itemData: ItemWithImage[];
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

  return (
    <View
      ref={containerRef}
      className="flex flex-row  w-screen justify-center items-center border-b border-b-grayLight"
    >
      {data.map((section, i) => {
        return (
          <Tab
            key={section.key}
            selectedTabInt={selectedTabInt}
            sectionIndex={i}
            ref={section.ref}
            data={itemData}
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
        bottom: -2,
      }}
    ></Animated.View>
  );
};
