import { SignInButton as ClerkSignInButton } from "@clerk/clerk-react";

export function SignInButton() {
  return (
    <ClerkSignInButton mode="modal">
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Sign In
      </button>
    </ClerkSignInButton>
  );
}
