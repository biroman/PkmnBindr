import React from "react";
import ConversationItem from "./ConversationItem";
import {
  InboxIcon,
  ChatBubbleLeftRightIcon as ChatSolid,
} from "@heroicons/react/24/solid";

const ConversationList = ({
  conversations,
  loading,
  isOwner,
  selectedConversation,
  userProfiles,
  setUserProfiles,
  onSelectConversation,
}) => {
  return (
    <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChatSolid className="w-5 h-5 text-gray-700" />
          Conversations
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full">
            <InboxIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              No conversations yet
            </h3>
            <p className="text-gray-500 max-w-xs">
              {isOwner
                ? "You can start a new conversation from the user management panel."
                : "Administrators can reach out to you here. Stay tuned!"}
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isOwner={isOwner}
              isSelected={selectedConversation?.id === conversation.id}
              userProfiles={userProfiles}
              setUserProfiles={setUserProfiles}
              onSelect={onSelectConversation}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
