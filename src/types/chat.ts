export interface CreateChatDto {
  userAId: string;
  userBId: string;
}

export interface CreateGroupChatDto {
  title: string;
  adminId: string;
  memberIds: string[];
}

export interface AddGroupMemberDto {
  requestingUserId: string;
  userId: string;
}

export interface RemoveGroupMemberDto {
  requestingUserId: string;
  userId: string;
}

export interface SendMessageDto {
  senderId: string;
  text: string;
}

export interface EditMessageDto {
  userId: string;
  text: string;
}

export interface DeleteMessageDto {
  userId: string;
}

export interface MarkMessageReadDto {
  userId: string;
}

export interface UpdateLastSeenDto {
  userId: string;
  messageId: string;
}

export interface MessageDocument {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  readBy: Record<string, string>;
}

export interface LastSeenDocument {
  userId: string;
  messageId: string;
  updatedAt: string;
}
