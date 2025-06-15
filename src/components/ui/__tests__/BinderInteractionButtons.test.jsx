import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import BinderInteractionButtons from "../BinderInteractionButtons";
import { BinderInteractionService } from "../../../services/BinderInteractionService";

// Mock the auth hook
vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-123" },
  }),
}));

// Mock the service
vi.mock("../../../services/BinderInteractionService", () => ({
  BinderInteractionService: {
    getBinderInteractions: vi.fn(),
    toggleLike: vi.fn(),
    toggleFavorite: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BinderInteractionButtons", () => {
  const mockBinderMetadata = {
    name: "Test Binder",
    ownerName: "Test Owner",
    ownerId: "owner-123",
    cardCount: 25,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    BinderInteractionService.getBinderInteractions.mockResolvedValue({
      isLiked: false,
      isFavorited: false,
      likeCount: 0,
      totalLikes: 0,
    });
  });

  it("renders like and favorite buttons", async () => {
    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Like")).toBeInTheDocument();
      expect(screen.getByText("Favorite")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    // Should show loading skeleton
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("handles like button click", async () => {
    BinderInteractionService.toggleLike.mockResolvedValue(true);

    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Like")).toBeInTheDocument();
    });

    const likeButton = screen.getByText("Like").closest("button");
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(BinderInteractionService.toggleLike).toHaveBeenCalledWith(
        "test-binder-123",
        "test-user-123",
        false
      );
    });
  });

  it("handles favorite button click", async () => {
    BinderInteractionService.toggleFavorite.mockResolvedValue(true);

    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Favorite")).toBeInTheDocument();
    });

    const favoriteButton = screen.getByText("Favorite").closest("button");
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(BinderInteractionService.toggleFavorite).toHaveBeenCalledWith(
        "test-binder-123",
        "test-user-123",
        false,
        mockBinderMetadata
      );
    });
  });

  it("shows like count when greater than 0", async () => {
    BinderInteractionService.getBinderInteractions.mockResolvedValue({
      isLiked: true,
      isFavorited: false,
      likeCount: 5,
      totalLikes: 5,
    });

    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Liked")).toBeInTheDocument();
    });
  });

  it("prevents spam clicking", async () => {
    BinderInteractionService.toggleLike.mockResolvedValue(true);

    render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Like")).toBeInTheDocument();
    });

    const likeButton = screen.getByText("Like").closest("button");

    // Click multiple times rapidly
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);

    // Should only be called once due to loading state
    await waitFor(() => {
      expect(BinderInteractionService.toggleLike).toHaveBeenCalledTimes(1);
    });
  });

  it("does not render for unauthenticated users", () => {
    // Mock unauthenticated user
    vi.mocked(require("../../../hooks/useAuth").useAuth).mockReturnValue({
      user: null,
    });

    const { container } = render(
      <BinderInteractionButtons
        binderId="test-binder-123"
        binderMetadata={mockBinderMetadata}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
