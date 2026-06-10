import { supabase } from '../lib/supabase.js';

export class BaseService {
  /**
   * Universal error handler for Supabase queries
   */
  static async handleQuery(queryPromise, actionName = 'Action') {
    try {
      const { data, error } = await queryPromise;
      if (error) {
        console.error(`[${actionName} Error]:`, error.message);
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      console.error(`[${actionName} Exception]:`, err.message);
      throw err;
    }
  }

  /**
   * Ensure user is authenticated before critical operations
   */
  static async requireAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      throw new Error('Authentication required.');
    }
    return session.user;
  }
}
