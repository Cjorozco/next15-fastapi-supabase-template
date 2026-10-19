/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_demoData from "../lib/demoData.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_taskDto from "../lib/taskDto.js";
import type * as lib_taskFields from "../lib/taskFields.js";
import type * as migrations from "../migrations.js";
import type * as projects from "../projects.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  demo: typeof demo;
  "lib/authorization": typeof lib_authorization;
  "lib/demoData": typeof lib_demoData;
  "lib/errors": typeof lib_errors;
  "lib/taskDto": typeof lib_taskDto;
  "lib/taskFields": typeof lib_taskFields;
  migrations: typeof migrations;
  projects: typeof projects;
  tasks: typeof tasks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
