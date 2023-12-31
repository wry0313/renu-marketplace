import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import LeftChevron from "../../components/LeftChevron";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../hooks/useSession";
import { getSavedItems } from "../../api";
import RefreshScreen from "../../components/RefreshScreen";
import { FlashList } from "@shopify/flash-list";
import { ItemListing } from "../../components/ItemListing";
import React from "react";

export default function SavedItemsPage() {
  const router = useRouter();
  const { session } = useSession();
  const {
    data: savedItemData,
    isError: isErrorSavedItem,
    isLoading: isLoadingSavedItem,
    refetch,
  } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => getSavedItems(session!.token),
    enabled: !!session && !!session.token,
  });
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <>
      <SafeAreaView className="bg-bgLight" />
      <View className="bg-bgLight h-full">
        <View className="flex flex-row items-center">
          <Pressable onPress={router.back} className="p-3">
            <LeftChevron />
          </Pressable>
          <Text className=" font-Poppins_600SemiBold text-xl">
            Saved items
            <Text className="font-Poppins_500Medium text-sm">
              {" "}
              ({savedItemData?.length ?? 0})
            </Text>{" "}
          </Text>
        </View>

        <View className="bg-greyLight h-full">
          {isLoadingSavedItem ? (
            <></>
          ) : isErrorSavedItem ? (
            <View className="-mt-[30%] flex-grow">
              <RefreshScreen
                displayText="Something went wrong."
                refetch={refetch}
              />
            </View>
          ) : savedItemData.length === 0 ? (
            <View className="-mt-[30%] flex-grow">
              <RefreshScreen
                displayText="You have no saved items."
                refetch={refetch}
              />
            </View>
          ) : (
            <FlashList
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    setRefreshing(true);
                    await refetch();
                    setRefreshing(false);
                  }}
                />
              }
              showsVerticalScrollIndicator={false}
              data={savedItemData}
              numColumns={2}
              contentContainerStyle={{
                paddingTop: 10,
                paddingLeft: 10,
              }}
              keyExtractor={(item) => item.id.toString()}
              renderItem={ItemListing}
              estimatedItemSize={320}
              removeClippedSubviews={true}
            />
          )}
        </View>
      </View>
    </>
  );
}
