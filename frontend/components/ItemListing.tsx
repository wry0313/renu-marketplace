import { Dimensions, View, Text } from "react-native";
import { Link } from "expo-router";

import relativeTime from "dayjs/plugin/relativeTime";
import { Image } from "expo-image";
import { ItemWithImage } from "../types/types";
import dayjs from "dayjs";
dayjs.extend(relativeTime);

const horizontalGapPx = 10;
const imageWidth = (Dimensions.get("window").width - horizontalGapPx * 3) / 2;

export function ItemListing(props: { item: ItemWithImage }) {
  return (
    <Link href={`/item/${props.item.id}`} className="flex flex-col px-[5px] shadow">
      <View className="flex flex-col border-1 border-grayMedium">
        <Image
          source={{ uri: props.item.item_images[0] }}
          className="object-cover rounded-t"
          style={{
            width: imageWidth,
            maxWidth: imageWidth,
            height: (imageWidth * 4) / 3,
          }}
        />
        <View className="h-fit py-2.5 px-2.5 bg-white rounded-b flex flex-col">
          <Text className="font-Manrope_600SemiBold text-sm">
            {props.item.name}
          </Text>
          <Text className="font-Manrope_500Medium text-xs">
            {dayjs(props.item.created_at).fromNow()}
          </Text>
          <Text className="text-purplePrimary font-Manrope_600SemiBold text-xl">
            ${props.item.price}
          </Text>
        </View>
      </View>
    </Link>
  );
}
