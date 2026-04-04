import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureTables } from '@/db/migrate';
import { v4 as uuidv4 } from 'uuid';

ensureTables();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        action: { label: 'Action', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (credentials.action === 'register') {
          const existing = db.select().from(users).where(eq(users.email, credentials.email)).get();
          if (existing) throw new Error('Email already registered');

          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          const id = uuidv4();
          db.insert(users).values({
            id,
            name: credentials.name || credentials.email.split('@')[0],
            email: credentials.email,
            password: hashedPassword,
          }).run();

          return { id, name: credentials.name || credentials.email.split('@')[0], email: credentials.email };
        }

        const user = db.select().from(users).where(eq(users.email, credentials.email)).get();
        if (!user) throw new Error('No account found with this email');

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error('Invalid password');

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id; }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET || 'clauseguard-dev-secret-change-in-production',
};
