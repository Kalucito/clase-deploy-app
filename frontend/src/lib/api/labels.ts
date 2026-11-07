import { request } from "./client";

export const listLabels = () => request<string[]>("/labels");
