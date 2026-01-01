import React, { useState, useEffect, useRef } from 'react';
import { User, FeedItem } from '../types';
import { supabase } from '../services/api';
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  Trash2,
  X,
  Loader2,
  Heart,
  CheckCircle2,
  Pin
} from 'lucide-react';

interface NewsfeedProps {
  user: User;
}

type MediaType = 'image' | 'video';

type CommentItem = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  media_url?: string;
  media_type?: MediaType | '';
  timestamp: number;
};

const Newsfeed: React.FC<NewsfeedProps> = ({ user }) => {
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // Media states for Post
  const [mediaFile, setMediaFile] = useState<{ url: string; type: MediaType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment states
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentMedia, setCommentMedia] = useState<Record<string, { url: string; type: MediaType } | null>>({});
  const [isCommenting, setIsCommenting] = useState<Record<string, boolean>>({});
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.class_id) return;
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.class_id]);

  const sortPosts = (data: FeedItem[]) => {
    return [...data].sort((a, b) => {
      const aPinned = a.is_pinned === true || String(a.is_pinned).toLowerCase() === 'true';
      const bPinned = b.is_pinned === true || String(b.is_pinned).toLowerCase() === 'true';
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return Number(b.timestamp) - Number(a.timestamp);
    });
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('class_id', user.class_id);

      if (error) throw error;

      const safe = Array.isArray(data) ? (data as FeedItem[]) : [];
      setPosts(sortPosts(safe));
    } catch (e) {
      console.error('Lỗi tải bảng tin:', e);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, targetPostId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type: MediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (targetPostId) {
        setCommentMedia((prev) => ({ ...prev, [targetPostId]: { url: result, type } }));
      } else {
        setMediaFile({ url: result, type });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !mediaFile) return;

    setIsPosting(true);
    try {
      const payload: any = {
        class_id: user.class_id,
        author_name: user.name,
        author_role: user.role,
        content: newPostContent,
        media_url: mediaFile?.url || '',
        media_type: mediaFile?.type || '',
        timestamp: Date.now(),
        likes_count: 0,
        comments_json: [],
        is_pinned: false
      };

      const { error } = await supabase.from('feed_posts').insert(payload);
      if (error) throw error;

      setNewPostContent('');
      setMediaFile(null);
      await loadPosts();
    } catch (e) {
      console.error(e);
      alert('Không thể đăng bài. Hãy thử lại.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // Optimistic UI
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: (Number(p.likes_count) || 0) + 1 } : p))
      );

      // Update DB (simple 방식)
      const post = posts.find((p) => p.id === postId);
      const nextLikes = (Number(post?.likes_count) || 0) + 1;

      const { error } = await supabase.from('feed_posts').update({ likes_count: nextLikes }).eq('id', postId);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      // rollback nhẹ: tải lại
      loadPosts();
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleComment = async (postId: string) => {
    if (isCommenting[postId]) return;

    const content = commentInputs[postId] || '';
    const media = commentMedia[postId];
    if (!content.trim() && !media) return;

    setIsCommenting((prev) => ({ ...prev, [postId]: true }));
    try {
      // 1) lấy comments_json hiện tại
      const { data, error: readErr } = await supabase
        .from('feed_posts')
        .select('comments_json')
        .eq('id', postId)
        .single();

      if (readErr) throw readErr;

      const current: CommentItem[] = Array.isArray(data?.comments_json) ? data.comments_json : [];

      const newComment: CommentItem = {
        id: crypto.randomUUID(),
        post_id: postId,
        author_id: String(user.id),
        author_name: user.name,
        author_role: user.role,
        content,
        media_url: media?.url || '',
        media_type: media?.type || '',
        timestamp: Date.now()
      };

      const updated = [...current, newComment];

      // 2) update lại comments_json
      const { error: upErr } = await supabase.from('feed_posts').update({ comments_json: updated }).eq('id', postId);
      if (upErr) throw upErr;

      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setCommentMedia((prev) => ({ ...prev, [postId]: null }));
      await loadPosts();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi bình luận. Hãy thử lại.');
    } finally {
      setIsCommenting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Xóa thông báo này?')) return;
    try {
      const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
      if (error) throw error;
      loadPosts();
    } catch (e) {
      console.error(e);
      alert('Không thể xóa bài. Hãy thử lại.');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Xóa bình luận này?')) return;

    try {
      const { data, error: readErr } = await supabase
        .from('feed_posts')
        .select('comments_json')
        .eq('id', postId)
        .single();
      if (readErr) throw readErr;

      const current: CommentItem[] = Array.isArray(data?.comments_json) ? data.comments_json : [];
      const updated = current.filter((c) => String(c.id) !== String(commentId));

      const { error: upErr } = await supabase.from('feed_posts').update({ comments_json: updated }).eq('id', postId);
      if (upErr) throw upErr;

      loadPosts();
    } catch (e) {
      console.error(e);
      alert('Không thể xóa bình luận. Hãy thử lại.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Cộng đồng học thuật</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
            Nơi trao đổi tri thức và thông tin
          </p>
        </div>
      </div>

      {user.role === 'teacher' && (
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-8 transform transition-all hover:shadow-blue-100 animate-in fade-in slide-in-from-top-4 duration-500">
          <form onSubmit={handlePost}>
            <div className="flex gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200 shrink-0">
                {user.name?.[0]}
              </div>
              <div className="flex-1 space-y-6">
                <textarea
                  className="w-full bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none min-h-[140px] font-bold text-lg"
                  placeholder={`Chào ${user.name}, có thông báo gì cho lớp hôm nay không?`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                />

                {mediaFile && (
                  <div className="relative rounded-3xl overflow-hidden border-4 border-slate-100 shadow-md animate-in zoom-in duration-300">
                    {mediaFile.type === 'image' ? (
                      <img src={mediaFile.url} className="w-full max-h-96 object-cover" />
                    ) : (
                      <video src={mediaFile.url} className="w-full max-h-96 object-cover" controls />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaFile(null)}
                      className="absolute top-4 right-4 bg-slate-900/80 text-white p-2 rounded-full hover:bg-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={(e) => handleMediaSelect(e)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                    >
                      <ImageIcon className="w-5 h-5" /> Media
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isPosting || (!newPostContent.trim() && !mediaFile)}
                    className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-30"
                  >
                    {isPosting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    Chia sẻ bài viết
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-10">
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="font-black text-slate-300 uppercase tracking-widest">Đang kết nối bảng tin...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => {
            const isPinned = post.is_pinned === true || String(post.is_pinned).toLowerCase() === 'true';
            const comments = Array.isArray((post as any).comments_json) ? ((post as any).comments_json as CommentItem[]) : [];

            return (
              <div
                key={post.id}
                className={`bg-white rounded-[3.5rem] shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ${
                  isPinned ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'
                }`}
              >
                {isPinned && (
                  <div className="bg-blue-600 text-white px-6 py-2 flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
                    <Pin className="w-3 h-3 fill-white" /> Đã ghim bởi giáo viên
                  </div>
                )}

                <div className="p-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ${
                          post.author_role === 'teacher' ? 'bg-blue-600' : 'bg-slate-800'
                        }`}
                      >
                        {post.author_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-lg leading-none">{post.author_name}</p>
                          {post.author_role === 'teacher' && (
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                              <CheckCircle2 className="w-3 h-3" /> Giáo viên
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">
                          {new Date(Number(post.timestamp)).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    {user.role === 'teacher' && (
                      <button
                        onClick={() => handleDeletePost(String(post.id))}
                        className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  <div className="text-slate-800 whitespace-pre-wrap leading-relaxed font-bold text-xl mb-8">
                    {post.content}
                  </div>

                  {post.media_url && (
                    <div className="mb-8 rounded-[2.5rem] overflow-hidden border-2 border-slate-50 shadow-sm bg-slate-900 group relative">
                      {post.media_type === 'video' ? (
                        <video src={post.media_url} controls className="w-full max-h-[500px] object-contain" />
                      ) : (
                        <img
                          src={post.media_url}
                          className="w-full max-h-[600px] object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-8 py-6 border-y border-slate-50">
                    <button
                      onClick={() => handleLike(String(post.id))}
                      className="flex items-center gap-3 text-slate-400 hover:text-rose-500 transition-all group"
                    >
                      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-rose-50 transition-colors">
                        <Heart
                          className={`w-6 h-6 ${(Number(post.likes_count) || 0) > 0 ? 'fill-rose-500 text-rose-500' : ''}`}
                        />
                      </div>
                      <span className="font-black text-lg">{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(String(post.id))}
                      className="flex items-center gap-3 text-slate-400 hover:text-blue-600 transition-all group"
                    >
                      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <span className="font-black text-lg">{comments.length}</span>
                    </button>
                  </div>
                </div>

                {expandedComments[String(post.id)] && (
                  <div className="bg-slate-50/50 p-10 space-y-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-6">
                      {comments.map((comment) => {
                        const canDelete = user.role === 'teacher' || String(user.id) === String(comment.author_id);

                        return (
                          <div key={comment.id} className="flex gap-4 group animate-in fade-in duration-300">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 text-sm ${
                                comment.author_role === 'teacher' ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-slate-700'
                              }`}
                            >
                              {comment.author_name?.[0]}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                                    {comment.author_name}
                                    {comment.author_role === 'teacher' && (
                                      <span className="text-[8px] bg-blue-100 text-blue-600 px-2 rounded-full uppercase">Ad</span>
                                    )}
                                  </span>
                                  <span className="text-[9px] font-black text-slate-300 uppercase">
                                    {new Date(comment.timestamp).toLocaleTimeString('vi-VN')}
                                  </span>
                                </div>

                                <p className="text-slate-700 font-bold text-sm leading-relaxed">{comment.content}</p>

                                {comment.media_url && (
                                  <div className="mt-4 rounded-2xl overflow-hidden border border-slate-50">
                                    {comment.media_type === 'video' ? (
                                      <video src={comment.media_url} controls className="w-full max-h-40 object-cover" />
                                    ) : (
                                      <img src={comment.media_url} className="w-full max-h-40 object-cover" />
                                    )}
                                  </div>
                                )}

                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(String(post.id), String(comment.id))}
                                    className="absolute -right-12 top-2 p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shrink-0 text-sm">
                        {user.name?.[0]}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="relative">
                          <textarea
                            readOnly={isCommenting[String(post.id)]}
                            className={`w-full bg-white border border-slate-200 rounded-3xl p-4 pr-14 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none min-h-[60px] ${
                              isCommenting[String(post.id)] ? 'opacity-50' : ''
                            }`}
                            placeholder={isCommenting[String(post.id)] ? 'Đang gửi...' : 'Viết phản hồi...'}
                            value={commentInputs[String(post.id)] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [String(post.id)]: e.target.value
                              }))
                            }
                          />

                          <div className="absolute right-4 bottom-4 flex gap-2">
                            <input
                              type="file"
                              ref={commentFileInputRef}
                              className="hidden"
                              accept="image/*,video/*"
                              onChange={(e) => handleMediaSelect(e, String(post.id))}
                            />
                            <button
                              type="button"
                              disabled={isCommenting[String(post.id)]}
                              onClick={() => commentFileInputRef.current?.click()}
                              className="p-2 text-slate-300 hover:text-blue-500 transition-colors disabled:opacity-30"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>

                            <button
                              type="button"
                              disabled={
                                isCommenting[String(post.id)] ||
                                (!commentInputs[String(post.id)]?.trim() && !commentMedia[String(post.id)])
                              }
                              onClick={() => handleComment(String(post.id))}
                              className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:bg-slate-400"
                            >
                              {isCommenting[String(post.id)] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {commentMedia[String(post.id)] && (
                          <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-white shadow-md animate-in zoom-in duration-300">
                            <img src={commentMedia[String(post.id)]!.url} className="w-24 h-24 object-cover" />
                            {!isCommenting[String(post.id)] && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCommentMedia((prev) => ({
                                    ...prev,
                                    [String(post.id)]: null
                                  }))
                                }
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-32 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
            <MessageCircle className="w-24 h-24 text-slate-200 mx-auto mb-6" />
            <h4 className="text-2xl font-black text-slate-300 uppercase tracking-widest">Bảng tin trống</h4>
            <p className="text-slate-200 font-bold mt-2">Hãy là người đầu tiên chia sẻ thông tin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Newsfeed;
