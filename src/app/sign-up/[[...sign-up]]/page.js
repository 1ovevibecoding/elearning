import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <SignUp
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
