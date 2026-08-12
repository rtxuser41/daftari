import { supabase } from '../lib/supabase';
import { INotificationRepository } from '../domain/repositories/interfaces';
import { Notification } from '../domain/models';

export class NotificationRepository implements INotificationRepository {
  subscribeNotifications(userId: string, onData: (notifications: Notification[]) => void): () => void {
    const fetchAndSubscribe = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        onData(data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          title: d.title,
          message: d.message,
          isRead: d.is_read,
          createdAt: d.created_at
        })) as Notification[]);
      }
    };
    
    fetchAndSubscribe();
    const sub = supabase.channel(`notifications_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `teacher_id=eq.${userId}` }, fetchAndSubscribe)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }
}
