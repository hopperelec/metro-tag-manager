import { PrismaClient } from "../../../prisma/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/tags.db" }),
});
export default prisma;
