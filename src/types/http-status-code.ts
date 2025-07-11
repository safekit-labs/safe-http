import { HTTP_STATUS_CODE } from "@/libs/status-codes";

export type HttpStatusCode =
	(typeof HTTP_STATUS_CODE)[keyof typeof HTTP_STATUS_CODE];