import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { libraryInvitesRoutes } from "./invites";
import { librariesCoreRoutes } from "./libraries";
import { libraryMembersRoutes } from "./members";

export const librariesRoutes = new Hono<AppEnv>();

librariesRoutes.route("/", librariesCoreRoutes);
librariesRoutes.route("/", libraryMembersRoutes);
librariesRoutes.route("/", libraryInvitesRoutes);
