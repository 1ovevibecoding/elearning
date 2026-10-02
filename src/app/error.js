"use client";
export default function Error({ error, reset }) {
  return <div>Something went wrong: {error.message}</div>;
}
