import { describe, it, expect, vi } from 'vitest';
import { mapDbCaseToCase, mapDbCommentToComment } from './caseMapper';

vi.mock('@services/anonymity', () => ({
  getDisplayName: vi.fn((username) => username || undefined),
  getAnonymousAvatar: vi.fn((userId) => `https://api.dicebear.com/7.x/identicon/svg?seed=${userId || 'default'}`),
}));

describe('mapDbCaseToCase', () => {
  it('debería mapear un caso básico', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test Case',
      category: 'Relationship',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'juanperez', is_anonymous: false, avatar_url: 'https://example.com/avatar.jpg' },
      side_a_content: 'Esta es mi historia',
    }, 'user_current');

    expect(result.id).toBe('case_001');
    expect(result.title).toBe('Test Case');
    expect(result.category).toBe('Relationship');
    expect(result.type).toBe('vote');
    expect(result.status).toBe('PUBLIC');
    expect(result.sideA.story).toBe('Esta es mi historia');
    expect(result.sideAUserId).toBe('user_a');
    expect(result.createdAt).toBe('2024-01-15T10:00:00Z');
  });

  it('debería mapear reacciones en formato array legacy', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
      reactions: [
        { emoji: 'LIKE', user_id: 'user_1' },
        { emoji: 'LIKE', user_id: 'user_2' },
        { emoji: 'LOVE', user_id: 'user_3' },
      ],
    });

    expect(result.reactions).toEqual({ LIKE: 2, LOVE: 1, ANGRY: 0 });
  });

  it('debería preferir reactions_summary sobre array legacy', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
      reactions: [{ emoji: 'LIKE', user_id: 'user_1' }],
      reactions_summary: { counts: { LIKE: 10, LOVE: 5, ANGRY: 1 } },
      user_reaction: 'LIKE',
    });

    expect(result.reactions).toEqual({ LIKE: 10, LOVE: 5, ANGRY: 1 });
    expect(result.userReaction).toBe('LIKE');
  });

  it('debería separar imágenes por side', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
      images: [
        { id: 'img_1', url: 'https://example.com/a.jpg', side: 'A' },
        { id: 'img_2', url: 'https://example.com/b.jpg', side: 'B' },
        { id: 'img_3', url: 'https://example.com/a2.jpg', side: 'A' },
      ],
    });

    expect(result.sideA.evidence).toHaveLength(2);
    expect(result.sideB.evidence).toHaveLength(1);
    expect(result.sideA.evidence[0].url).toBe('https://example.com/a.jpg');
    expect(result.sideB.evidence[0].url).toBe('https://example.com/b.jpg');
  });

  it('debería devolver sideB como "Esperando..." si no hay side_b_user', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'WAITING',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
    });

    expect(result.sideB.name).toBe('Esperando...');
    expect(result.sideB.story).toBe('Esperando respuesta...');
  });

  it('debería mapear field is_saved e isShared', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
      is_saved: true,
      isShared: true,
      comments: [],
    });

    expect(result.isSaved).toBe(true);
    expect(result.isShared).toBe(true);
  });

  it('debería mapear subtítulos personalizados', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
      side_a_subtitle: 'Estoy seguro',
      side_b_subtitle: 'Está equivocado',
      both_wrong_subtitle: 'Ambas están mal',
    });

    expect(result.sideASubtitle).toBe('Estoy seguro');
    expect(result.sideBSubtitle).toBe('Está equivocado');
    expect(result.bothWrongSubtitle).toBe('Ambas están mal');
  });

  it('debería mapear array vacío de imágenes si no hay', () => {
    const result = mapDbCaseToCase({
      id: 'case_001',
      title: 'Test',
      category: 'Other',
      type: 'vote',
      status: 'PUBLIC',
      created_at: '2024-01-15T10:00:00Z',
      side_a_user: { id: 'user_a', username: 'creator', is_anonymous: false, avatar_url: '' },
    });

    expect(result.sideA.evidence).toEqual([]);
    expect(result.sideB.evidence).toEqual([]);
  });
});

describe('mapDbCommentToComment', () => {
  it('debería mapear un comentario básico', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Este es un comentario',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_1', username: 'juanperez', is_anonymous: false, avatar_url: 'https://example.com/avatar.jpg' },
    });

    expect(result.id).toBe('comment_001');
    expect(result.text).toBe('Este es un comentario');
    expect(result.timestamp).toBe('2024-01-15T10:00:00Z');
  });

  it('debería marcar isOwner cuando el userId coincide', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Test',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_current', username: 'me', is_anonymous: false, avatar_url: '' },
    }, 'user_current');

    expect(result.isOwner).toBe(true);
  });

  it('debería NO marcar isOwner cuando el userId no coincide', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Test',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_other', username: 'other', is_anonymous: false, avatar_url: '' },
    }, 'user_current');

    expect(result.isOwner).toBe(false);
  });

  it('debería procesar reacciones legacy del comentario', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Test',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_1', username: 'user1', is_anonymous: false, avatar_url: '' },
      reactions: [
        { emoji: 'LIKE', user_id: 'user_1' },
        { emoji: 'LIKE', user_id: 'user_2' },
      ],
    }, 'user_1');

    expect(result.reactions).toEqual({ LIKE: 2, LOVE: 0, ANGRY: 0 });
    expect(result.userReaction).toBe('LIKE');
  });

  it('debería mapear replies recursivamente', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Parent',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_1', username: 'user1', is_anonymous: false, avatar_url: '' },
      replies: [
        {
          id: 'reply_001',
          content: 'Reply text',
          created_at: '2024-01-15T11:00:00Z',
          user: { id: 'user_2', username: 'user2', is_anonymous: false, avatar_url: '' },
        },
      ],
    });

    expect(result.replies).toHaveLength(1);
    expect(result.replies[0].id).toBe('reply_001');
    expect(result.replies[0].text).toBe('Reply text');
  });

  it('debería manejar contentLanguage', () => {
    const result = mapDbCommentToComment({
      id: 'comment_001',
      content: 'Hola',
      created_at: '2024-01-15T10:00:00Z',
      user: { id: 'user_1', username: 'user1', is_anonymous: false, avatar_url: '' },
      content_language: 'es',
    });

    expect(result.contentLanguage).toBe('es');
  });
});
