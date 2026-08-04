import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="auth-page">
      <SignIn
        appearance={{
          elements: {
            rootBox: "auth-box",
            card: "auth-card",
          },
        }}
      />
    </div>
  );
}
