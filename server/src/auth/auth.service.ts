import { UserRole } from "@/app_modules/@generated/user-role/user-role.model";
import { User } from "@/app_modules/@generated/user/user.model";
import { GraphQLContext, JwtUser } from "@/app_modules/@types/types";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";
import dayjs from "dayjs";

import { PrismaService } from "../app_modules/prisma/prisma.service";
import { getToken } from "../app_modules/utils/helpers";
import {
  COOKIE_NAME,
  COOKIE_SERIALIZE_OPTIONS,
  TOKEN_EXPIRES_IN,
} from "../constants";
import { LoginUserInput } from "./model/input/login-user.input";
import { RegisterUserInput } from "./model/input/register-user.input";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginUserInput) {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: data.username } },
      include: { UserRole: true },
    });

    try {
      if (
        user &&
        (await argon2.verify(user.password, data.password, { hashLength: 100 }))
      ) {
        const { password, ...result } = user;
        return result as User & {
          UserRole: UserRole[];
        };
      }
    } catch (_) {
      return null;
    }
  }

  async registerUser({ ...data }: RegisterUserInput) {
    data.password = await argon2.hash(data.password);
    const user = await this.prisma.user.create({ data });
    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        name: "USER",
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
    return await this.prisma.user.update({
      where: { id: user.id },
      data: { createdBy: user.id, updatedBy: user.id },
      include: { UserRole: true },
    });
  }

  async createToken({
    id,
    username,
    UserRole,
  }: User & { UserRole: UserRole[] }) {
    const payload: JwtUser = {
      username,
      sub: id,
      roles: UserRole.map((r) => r.name),
    };
    const expiresIn = TOKEN_EXPIRES_IN;
    const token = this.jwtService.sign(payload, {
      expiresIn,
      secret: process.env.SECRET,
    });

    await this.prisma.token.create({
      data: {
        token,
        expiresIn: dayjs().add(TOKEN_EXPIRES_IN, "seconds").toDate(),
        createdBy: id,
        updatedBy: id,
      },
    });

    return token;
  }

  async logout(ctx: GraphQLContext) {
    const token = getToken({ ctx });

    ctx.reply.clearCookie(
      COOKIE_NAME,
      COOKIE_SERIALIZE_OPTIONS(ctx.req.headers?.referer),
    );

    try {
      await this.deleteTokens({
        where: { OR: [{ token }, { expiresIn: { lt: new Date() } }] },
      });
    } catch (_) {}

    return true;
  }

  async checkPassword(password: string, username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username },
      select: { password: true },
    });
    if (user && (await argon2.verify(user.password, password))) {
      return true;
    }
    return false;
  }

  async changePassword(username: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    if (user) {
      const password = await argon2.hash(newPassword);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password },
      });
      return true;
    }
    return false;
  }

  async deleteTokens(options: Prisma.TokenDeleteManyArgs) {
    return await this.prisma.token.deleteMany(options);
  }
}
