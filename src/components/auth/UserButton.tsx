import { UserButton as ClerkUserButton } from "@clerk/clerk-react";

/**
 * User profile button with dropdown menu
 * Shows user avatar and provides access to account settings
 */
export function UserButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
        },
      }}
    />
  );
}
