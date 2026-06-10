import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';

export const AuthService = {
  async signUp(email, password, fullName) {
    return BaseService.handleQuery(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      }),
      'AuthService.signUp'
    );
  },

  async signIn(email, password) {
    return BaseService.handleQuery(
      supabase.auth.signInWithPassword({ email, password }),
      'AuthService.signIn'
    );
  },

  async signOut() {
    return BaseService.handleQuery(
      supabase.auth.signOut(),
      'AuthService.signOut'
    );
  },

  async getSession() {
    return BaseService.handleQuery(
      supabase.auth.getSession(),
      'AuthService.getSession'
    );
  },

  async getUser() {
    return BaseService.handleQuery(
      supabase.auth.getUser(),
      'AuthService.getUser'
    );
  }
};
