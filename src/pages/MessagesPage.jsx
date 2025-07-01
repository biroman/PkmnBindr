import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMessages, useConversationMessages } from "../hooks/useMessages";
import { useAuth, useOwner } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { InboxIcon as InboxSolid } from "@heroicons/react/24/solid";
import ConversationList from "../components/messages/ConversationList";
import ConversationView from "../components/messages/ConversationView";
import NewConversationModal from "../components/messages/NewConversationModal";
import { useMediaQuery } from "react-responsive";

const MessagesPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const location = useLocation();
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  const {
    conversations,
    unreadCount,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteConversation,
    startConversation,
  } = useMessages();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [preSelectedUser, setPreSelectedUser] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});

  const { messages, loading: messagesLoading } = useConversationMessages(
    selectedConversation?.id
  );

  useEffect(() => {
    if (location.state?.selectedUser && isOwner) {
      const selectedUser = location.state.selectedUser;
      setPreSelectedUser(selectedUser);
      setShowNewConversationModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isOwner]);

  useEffect(() => {
    if (selectedConversation) {
      const unreadCount = isOwner
        ? selectedConversation.unreadByAdmin
        : selectedConversation.unreadByUser;

      if (unreadCount > 0) {
        markAsRead(selectedConversation.id);
      }
    }
  }, [selectedConversation, markAsRead, isOwner]);

  useEffect(() => {
    if (
      !isMobile &&
      selectedConversation === null &&
      conversations.length > 0
    ) {
      // On desktop, if no conversation is selected, default to the first one.
      // setSelectedConversation(conversations[0]);
    }
  }, [isMobile, conversations, selectedConversation]);

  const handleSendMessage = async (message) => {
    if (!message.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation.id, message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      setSelectedConversation(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleStartNewConversation = async (message) => {
    if (!preSelectedUser || !message.trim()) return;
    try {
      const result = await startConversation(
        preSelectedUser.uid,
        preSelectedUser.displayName || preSelectedUser.email,
        preSelectedUser.email,
        message
      );
      if (result.success) {
        setShowNewConversationModal(false);
        setPreSelectedUser(null);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please log in to view your messages.
          </p>
          <Link to="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error Loading Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error.message || "Failed to load conversations."}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const showConversationView = isMobile ? selectedConversation !== null : true;
  const showConversationList = isMobile ? selectedConversation === null : true;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-8"></div>

        <div
          className="bg-card-background rounded-xl shadow-lg border border-border overflow-hidden"
          style={{ height: "calc(100vh - 200px)" }}
        >
          <div className="flex h-full">
            {showConversationList && (
              <ConversationList
                conversations={conversations}
                loading={loading}
                isOwner={isOwner}
                selectedConversation={selectedConversation}
                userProfiles={userProfiles}
                setUserProfiles={setUserProfiles}
                onSelectConversation={handleSelectConversation}
              />
            )}

            {showConversationView && (
              <ConversationView
                user={user}
                isOwner={isOwner}
                selectedConversation={selectedConversation}
                userProfiles={userProfiles}
                messages={messages}
                messagesLoading={messagesLoading}
                onSendMessage={handleSendMessage}
                onDeleteConversation={handleDeleteConversation}
                onBack={isMobile ? handleBackToList : null}
              />
            )}
          </div>
        </div>

        {showNewConversationModal && preSelectedUser && (
          <NewConversationModal
            user={preSelectedUser}
            onClose={() => {
              setShowNewConversationModal(false);
              setPreSelectedUser(null);
            }}
            onStartConversation={handleStartNewConversation}
          />
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
