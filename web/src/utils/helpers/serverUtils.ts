import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import fs from "fs";
import { print } from "graphql";
import { BACKEND_INTERNAL_URL } from "../constants";

export const customFetcherServer = async <
  TData,
  TVariables,
  T extends boolean = false,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: RequestInit["headers"],
  withHeaders: T = false as T,
): Promise<T extends false ? TData : { data: TData; headers: Headers }> => {
  const res = await fetch(
    isDocker()
      ? BACKEND_INTERNAL_URL
      : process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "cache-control": "no-cache",
        ...options,
      },
      cache: "no-store",
      body: JSON.stringify({
        query: print(document),
        variables,
      }),
    },
  );

  const json = await res.json();
  if (json.errors) {
    const errorText = JSON.stringify(
      json.errors.map((e: { message: string | string[] }) => e.message).flat(),
    );
    throw new Error(errorText);
  }
  return withHeaders ? { data: json.data, headers: res.headers } : json.data;
};

export function isDocker() {
  function hasDockerEnv() {
    try {
      fs.statSync("/.dockerenv");
      return true;
    } catch {
      return false;
    }
  }

  function hasDockerCGroup() {
    try {
      return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
    } catch {
      return false;
    }
  }

  return hasDockerEnv() || hasDockerCGroup();
}
