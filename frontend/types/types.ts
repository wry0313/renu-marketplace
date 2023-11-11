import type { Item, User } from "@prisma/client";

export type UserWithCount = User & {
  active_listing_count: number;
  sales_done_count: number;
};
export type ItemWithImage = Item & { item_images: string[] };

export type Measure = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RefAndKey = {
  key: string;
  ref: React.RefObject<any>;
};

export type Session = {
  token: string;
  email: string;
  name: string;
  user_id: number;
};

export type ChatGroup = {
  chat_id: number;
  item_id: number;
  other_user_id: number;
  other_user_name: string;
  item_name: string;
  item_price: number;
  item_category: string;
  item_description: string;
  item_status: string;
  item_image: string;
  last_message_content: string;
  last_message_sent_at: Date;
};

export type ChatWindow = {
  chat_id: number;
  item_id: number;
  other_user_id: number;
  other_user_name: string;
  item_name: string;
  item_price: number;
  item_category: string;
  item_description: string;
  item_status: string;
  item_image: string;
};

export type ChatMessage = {
  id: number;
  content: string;
  sent_at: Date;
  from_me: number;
  // chat_id: number;
  // sender_id: number;
};

export type ChatId = { chat_id: number };
