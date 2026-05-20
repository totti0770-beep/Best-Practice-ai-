import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview(hospitalId: string) {
    const [docStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_docs,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_docs,
        COUNT(*) FILTER (WHERE status = 'under_review') as pending_docs,
        COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + 30 AND status = 'active') as expiring_soon
      FROM documents
      WHERE hospital_id = $1
    `, [hospitalId]);

    const [userStats] = await this.dataSource.query(`
      SELECT COUNT(*) as total_users
      FROM users WHERE hospital_id = $1 AND is_active = true
    `, [hospitalId]);

    const [aiStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE no_source_flag = true) as no_source_count
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.hospital_id = $1 AND cm.role = 'assistant'
    `, [hospitalId]);

    return {
      activeDocs: parseInt(docStats.active_docs),
      draftDocs: parseInt(docStats.draft_docs),
      pendingDocs: parseInt(docStats.pending_docs),
      expiringSoon: parseInt(docStats.expiring_soon),
      totalUsers: parseInt(userStats.total_users),
      totalAiQueries: parseInt(aiStats.total_queries),
      noSourceRate: aiStats.total_queries > 0
        ? Math.round((parseInt(aiStats.no_source_count) / parseInt(aiStats.total_queries)) * 100)
        : 0,
    };
  }

  async getDocumentsByStatus(hospitalId: string) {
    return this.dataSource.query(`
      SELECT status, COUNT(*) as count
      FROM documents WHERE hospital_id = $1
      GROUP BY status
    `, [hospitalId]);
  }

  async getDocumentsByCategory(hospitalId: string) {
    return this.dataSource.query(`
      SELECT category, COUNT(*) as count
      FROM documents WHERE hospital_id = $1 AND status = 'active'
      GROUP BY category
    `, [hospitalId]);
  }

  async getAiUsage(hospitalId: string, days = 30) {
    return this.dataSource.query(`
      SELECT
        DATE(cm.created_at) as date,
        COUNT(*) as query_count
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.hospital_id = $1
        AND cm.role = 'user'
        AND cm.created_at >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE(cm.created_at)
      ORDER BY date
    `, [hospitalId, days]);
  }
}
