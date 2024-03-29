import { router } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image } from "expo-image";
import LeftChevron from "../../components/LeftChevron";
import {
  FlatList,
  LongPressGestureHandler,
  TouchableOpacity,
} from "react-native-gesture-handler";
import { useSession } from "../../hooks/useSession";
import { Picker, PickerIOS } from "@react-native-picker/picker";
import { IMAGES_URL, postAIComplete, postImages, postNewItem } from "../../api";
import { useQueryClient } from "@tanstack/react-query";
import { registerForPushNotificationsAsync } from "../../notification";
import * as Notifications from "expo-notifications";
import { ItemCategoryWithPicking } from "../../../shared/types";
import Toast from "react-native-toast-message";

const MAX_IMAGES = 6;

export default function UploadListingStepOne() {
  const [images, setImages] = React.useState<string[]>(["picker"]);
  const [_, requestPermission] = ImagePicker.useCameraPermissions();

  const pickImage = async () => {
    if (images.length > MAX_IMAGES) {
      alert(`You can only upload ${MAX_IMAGES} images`);
      return;
    }
    try {
      // No permissions request is necessary for launching the image library
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0,
      });

      if (!result.canceled) {
        const image = result.assets[0].uri;
        if (image) {
          setImages((prev) => [
            ...prev.slice(0, prev.length - 1),
            image,
            "picker",
          ]);
        }
      } else {
        console.debug("cancelled");
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Failed to upload image: " + e,
      });
    }
  };

  const imageWidth = Dimensions.get("window").width / 3 - 40;
  const imageHeight = imageWidth;

  const [category, setCategory] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");

  const { session } = useSession();

  const [uploading, setUploading] = React.useState(false);
  const iosPickerRef = React.useRef<PickerIOS>(null);
  const [completing, setCompleting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleComplete = async () => {
    if (images.length === 1) {
      Toast.show({
        type: "error",
        text1: "Please add at least one image",
      });
      // alert("Please add at least one image");
      return;
    }
    if (session === null || session.is_guest) {
      // alert("Please login to use this feature");
      Toast.show({
        type: "error",
        text1: "Please login to use this feature",
      });
      return;
    }
    if (completing) {
      return;
    }
    setCompleting(true);
    try {
      const uploadedImage = await postImages(images.slice(0, 1), true);
      const imageUrl = `${IMAGES_URL}${uploadedImage[0]}`;
      console.debug("imageUrl: ", imageUrl);
      const completionRes = await postAIComplete(session.token, imageUrl);
      console.debug("completionRes: ", completionRes);
      setTitle(completionRes.title);
      setPrice(String(completionRes.price));
      setDescription(completionRes.description);
      if (completionRes.price === 0) {
        setCategory("free");
        iosPickerRef.current?.setState("free");
      } else if (
        Object.keys(ItemCategoryWithPicking).includes(completionRes.category)
      ) {
        setCategory(completionRes.category);
        iosPickerRef.current?.setState(completionRes.category);
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Failed to complete AI: " + e,
      });
      console.error(e);
    }
    setCompleting(false);
  };
  const handleAddImage = () => {
    if (images.length > MAX_IMAGES) {
      alert(`You can only upload ${MAX_IMAGES} images`);
      return;
    }
    requestPermission().then((status) => {
      if (status.granted) {
        pickImage();
      } else {
        router.back();
      }
    });
  };
  const handleConfirmAndUpload = async () => {
    Alert.alert(
      "Confirm",
      "Are you sure you want to publish this item and all the information is correct?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            return;
          },
        },
        {
          text: "Yes",
          onPress: async () => {
            // alert popup says "enable notifications to get notified when someone wants to buy your item"
            const { status: existingStatus } =
              await Notifications.getPermissionsAsync();
            if (existingStatus !== "granted") {
              Alert.alert(
                "Enable notifications",
                "Enable notifications to get notified when someone wants to buy your item",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => {},
                  },
                  {
                    text: "OK",
                    onPress: () => {
                      registerForPushNotificationsAsync();
                    },
                  },
                ],
                { cancelable: false }
              );
            }
            setUploading(true);
            try {
              if (images.pop() !== "picker") {
                throw new Error("Last image is not picker");
              }
              const s3UrlsResponse = await postImages(images, false);

              const itemId = await postNewItem(
                session?.token || "",
                title,
                Number(price),
                description,
                category,
                s3UrlsResponse,
                location
              );
              console.debug("replace to: ", `/item/${itemId}`);
              queryClient.invalidateQueries(["list"]);
              router.replace(`/item/${itemId}`);
            } catch (e) {
              console.error(e);
            }
            setUploading(false);
          },
        },
      ],
      { cancelable: false }
    );
  };
  const handleUpload = async () => {
    if (session === null || session.is_guest) {
      // alert("Please login to publish item");
      Toast.show({
        type: "error",
        text1: "Please login to publish item",
      });
      return;
    }
    if (uploading) {
      return;
    }
    if (images.length === 1) {
      // alert("Please add at least one image");
      Toast.show({
        type: "error",
        text1: "Please add at least one image",
      });
      return;
    }
    if (title === "") {
      Toast.show({
        type: "error",
        text1: "Please enter a title",
      });
      // alert("Please enter a title");
      return;
    }
    if (price === "") {
      // alert("Please enter a price");
      Toast.show({
        type: "error",
        text1: "Please enter a price",
      });
      return;
    }
    if (isNaN(Number(price))) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid price",
      });
      // alert("Please enter a valid price");
      return;
    }
    if (Number(price) > 99999) {
      Toast.show({
        type: "error",
        text1: "Please enter a price less than $99999",
      });
      // alert("Please enter a price less than $99999");
      return;
    }
    // if category is part of item category but not picking
    if (
      !Object.keys(ItemCategoryWithPicking).includes(category) ||
      category === "picking"
    ) {
      alert("Please select a valid category");
      return;
    }
    if (description === "" || location === "") {
      let messgae = "";
      if (description === "") {
        messgae += "description";
      } else if (location === "") {
        messgae += "location";
      } else {
        messgae += "description and location";
      }
      Alert.alert(
        "Confirm",
        "Are you sure you don't need " +
          messgae +
          " information for your item?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              return;
            },
          },
          {
            text: "Continue",
            onPress: async () => {
              handleConfirmAndUpload();
            },
          },
        ]
      );
    } else {
      handleConfirmAndUpload();
    }
  };
  const colorScheme = useColorScheme();
  return (
    <>
      <SafeAreaView className="bg-bgLight dark:bg-blackPrimary">
        <View className="bg-bgLight h-full dark:bg-blackPrimary">
          <KeyboardAvoidingView
            behavior="position"
            style={{ flex: 1, zIndex: -100 }}
          >
            <View className="flex flex-row items-center justify-between border-b border-b-stone-300 dark:border-b-stone-800">
              <Pressable onPress={router.back} className="w-10 p-3">
                <LeftChevron />
              </Pressable>
              <Text className="font-Poppins_600SemiBold text-lg text-blackPrimary dark:text-bgLight">
                UPLOAD LISTING
              </Text>
              <View className="w-10 p-3" />
            </View>
            <Text className="w-full pt-2 px-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
              Add Photos ({images.length - 1}){" "}
            </Text>
            <ScrollView>
              <FlatList
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                data={images}
                scrollEnabled={true}
                style={{ marginTop: 4 }}
                horizontal
                keyExtractor={(item) => item}
                renderItem={({ item, index }) => {
                  return index === images.length - 1 ? (
                    <TouchableOpacity
                      onPress={handleAddImage}
                      style={{
                        width: imageWidth,
                        height: imageHeight,
                        borderRadius: 3,
                      }}
                      className="border border-dashed flex items-center justify-center ml-3 border-blackPrimary dark:border-bgLight"
                    >
                      <Plus />
                    </TouchableOpacity>
                  ) : (
                    <LongPressGestureHandler
                      onGestureEvent={() => {
                        setImages((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      <Image
                        source={{ uri: item }}
                        style={{
                          width: imageWidth,
                          height: imageHeight,
                          borderRadius: 3,
                          marginLeft: 12,
                        }}
                      />
                    </LongPressGestureHandler>
                  );
                }}
              />
              <View className="px-3">
                <TouchableOpacity onPress={handleComplete}>
                  <View className="px-2 py-1 mt-3 rounded-sm h-[36px] flex items-center justify-center bg-purplePrimary">
                    {completing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="font-Poppins_600SemiBold text-base text-bgLight">
                        Auto fill with AI
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <View className="pb-5 border-b border-b-stone-200 dark:border-b-stone-800">
                  <Text className="pb-2 w-full pt-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
                    Title
                  </Text>

                  <View className="bg-grayLight dark:bg-zinc-950 rounded-md">
                    <TextInput
                      onChangeText={(text) => setTitle(text)}
                      value={title}
                      placeholder="Enter a title"
                      className="p-3 h-fit text-blackPrimary dark:text-bgLight"
                    />
                  </View>
                </View>
                <View className="pb-5 border-b border-b-stone-200 dark:border-b-stone-800">
                  <Text className="pb-2 w-full pt-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
                    Price
                  </Text>
                  <View className="bg-grayLight dark:bg-zinc-950 rounded-md">
                    <TextInput
                      onChangeText={(text) => setPrice(text)}
                      value={price}
                      keyboardType="numeric"
                      placeholder="Enter a price"
                      className="p-3 h-fit text-blackPrimary dark:text-bgLight"
                    />
                  </View>
                </View>

                <View className="pb-5 border-b border-b-stone-200 dark:border-b-stone-800">
                  <Text className="pb-2 w-full pt-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
                    Description
                  </Text>

                  <View className="bg-grayLight dark:bg-zinc-950 rounded-md h-[120px]">
                    <TextInput
                      collapsable
                      multiline
                      onChangeText={(text) => setDescription(text)}
                      value={description}
                      placeholder="Enter a description"
                      className="p-3 h-fit text-blackPrimary dark:text-bgLight dark:placeholder:text-bgLight"
                    />
                  </View>
                </View>

                <View className="pb-5 border-b border-b-stone-200 dark:border-b-stone-800">
                  <Text className="pb-2 w-full pt-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
                    Meetup Location
                  </Text>

                  <View className="bg-grayLight dark:bg-zinc-950 rounded-md">
                    <TextInput
                      onChangeText={(text) => setLocation(text)}
                      value={location}
                      placeholder="Enter a location"
                      className="p-3 h-fit text-blackPrimary dark:text-bgLight"
                    />
                  </View>
                </View>
                <View className="border-b border-b-stone-200 dark:border-b-stone-800">
                  <Text className="pb-2 w-full pt-3 font-Poppins_600SemiBold text-base text-blackPrimary dark:text-bgLight">
                    Category:{" "}
                    {ItemCategoryWithPicking[category] === "Pick a category"
                      ? ""
                      : ItemCategoryWithPicking[category]}
                  </Text>
                  <Picker
                    selectedValue={category}
                    onValueChange={(itemValue) =>
                      setCategory(itemValue as string)
                    }
                  >
                    {Object.keys(ItemCategoryWithPicking).map((key) => (
                      <PickerIOS.Item
                        color={colorScheme === "dark" ? "white" : "black"}
                        ref={iosPickerRef}
                        key={key}
                        label={ItemCategoryWithPicking[key]}
                        value={key}
                      />
                    ))}
                  </Picker>
                </View>

                <View className="fixed bottom-0 h-[72px] w-full bg-bgLight dark:bg-blackPrimary border-t border-t-stone-200 dark:border-t-stone-800 py-3 px-6 flex items-center justify-center">
                  <Pressable
                    onPress={handleUpload}
                    className="w-full h-full rounded-sm bg-purplePrimary flex shadow-lg items-center justify-center"
                  >
                    {!uploading ? (
                      <Text className="font-SecularOne_400Regular text-xl text-white rounded-sm">
                        PUBLISH ITEM
                      </Text>
                    ) : (
                      <ActivityIndicator size="small" />
                    )}
                  </Pressable>
                </View>
              </View>
              <View className="h-16" />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </>
  );
}

const Plus = () => (
  <Svg width="28" height="28" viewBox="-7 -7 28 28" fill="none">
    <Circle cx="7" cy="7" r="14" fill="#181818" />
    <Path d="M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z" fill="#F9F9F9" />
  </Svg>
);
