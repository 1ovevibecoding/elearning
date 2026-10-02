import AppLayoutClient from "./app-layout-client";

export const metadata = {
  title: "PREP IELTS — Luyện thi thông minh",
};

export default function AppLayout({ children }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
