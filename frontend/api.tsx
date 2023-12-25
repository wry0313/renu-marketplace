import {
  AICompleteResponse,
  ChatGroup,
  ChatMessage,
  Item,
  User,
} from "./types";

export const API_URL = "https://api.gavinwang.dev";

export const REDIRECT_URL = "https://api.gavinwang.dev/auth/callback";

export const GOOGLE_OAUTH_CLIENT_ID =
  "479411838275-kpsk3vagvubv429vnhu85hsviahv8ed7.apps.googleusercontent.com";

export async function parseOrThrowResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errMsg = await res.text();
    throw new Error(errMsg);
  }
  return res.json();
}

export async function getUserMeInfo(sessionToken: string): Promise<User> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<User>(res);
}

export async function getUserInfo(userId: string): Promise<User> {
  const res = await fetch(`${API_URL}/users/${userId}`);
  return parseOrThrowResponse<User>(res);
}

export async function getUserActiveItems(userId: string): Promise<Item[]> {
  const res = await fetch(`${API_URL}/users/${userId}/items`);
  return parseOrThrowResponse<Item[]>(res);
}

export async function getSavedItems(sessionToken: string): Promise<Item[]> {
  const res = await fetch(`${API_URL}/saved/`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<Item[]>(res);
}

export async function getUserMeItems(sessionToken: string): Promise<Item[]> {
  const res = await fetch(`${API_URL}/users/me/items`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<Item[]>(res);
}

export async function getChatGroups(
  sessionToken: string,
  buyerOrSeller: string
): Promise<ChatGroup[]> {
  const res = await fetch(`${API_URL}/chats/${buyerOrSeller}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<ChatGroup[]>(res);
}

export async function getChatIdFromItemId(
  sessionToken: string,
  itemId: string
): Promise<number> {
  const res = await fetch(`${API_URL}/chats/id/${itemId}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<number>(res);
}

export async function getItem(itemId: string): Promise<Item> {
  const res = await fetch(`${API_URL}/items/${itemId}`);
  return parseOrThrowResponse<Item>(res);
}

export async function postItemStatus(
  sessionToken: string,
  itemId: number,
  status: string
) {
  const res = await fetch(`${API_URL}/items/${itemId}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ new_status: status }),
  });
  return parseOrThrowResponse<Item>(res);
}

export async function postChatRoomWithFirstMessage(
  sessionToken: string,
  message: string,
  itemId: string
): Promise<number> {
  const res = await fetch(`${API_URL}/chats/${itemId}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      first_message_content: message,
    }),
  });
  return parseOrThrowResponse<number>(res);
}

export async function postChangeSavedItemStatus(
  sessionToken: string,
  itemId: string,
  newStatus: boolean
): Promise<string> {
  const res = await fetch(`${API_URL}/saved/${itemId}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      new_status: newStatus,
    }),
  });
  return parseOrThrowResponse(res);
}

export async function getSavedItemStatus(
  sessionToken: string,
  itemId: string
): Promise<boolean> {
  const res = await fetch(`${API_URL}/saved/${itemId}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
  });
  return parseOrThrowResponse<boolean>(res);
}

export async function postAIComplete(
  sessionToken: string,
  imageUri: string
): Promise<AICompleteResponse> {
  const res = await fetch(`${API_URL}/openai/complete`, {
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      image: imageUri,
    }),
  });
  return parseOrThrowResponse<AICompleteResponse>(res);
}

export async function getSearchItems(query: string): Promise<Item[]> {
  const res = await fetch(`${API_URL}/search/items?query=${query}`);
  return parseOrThrowResponse<Item[]>(res);
}
