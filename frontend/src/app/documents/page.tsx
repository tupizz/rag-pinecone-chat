'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Heading } from '@/components/catalyst/heading';
import { Text } from '@/components/catalyst/text';
import { Badge } from '@/components/catalyst/badge';
import { Input } from '@/components/catalyst/input';
import { FileTextIcon, SearchIcon, DatabaseIcon, Loader2, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Document {
  id: string;
  score: number;
  text: string;
  metadata: {
    question?: string;
    answer?: string;
    category?: string;
    source?: string;
  };
}

interface DocumentsStats {
  total_vectors: number;
  dimension: number;
  namespaces: Record<string, any>;
}

export default function DocumentsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch documents and stats
  useEffect(() => {
    console.log('Documents page - isAuthenticated:', isAuthenticated);
    console.log('Documents page - authLoading:', authLoading);

    if (!isAuthenticated) {
      console.log('Not authenticated, skipping fetch');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching documents from API...');

        // Fetch documents
        console.log('Calling GET /api/documents...');
        const docsResponse = await apiClient.get('/documents', {
          params: { limit: 1000 }
        });
        console.log('Documents response:', docsResponse.data);
        setDocuments(docsResponse.data.documents || []);

        // Fetch stats
        console.log('Calling GET /api/documents/stats...');
        const statsResponse = await apiClient.get('/documents/stats');
        console.log('Stats response:', statsResponse.data);
        setStats(statsResponse.data);
      } catch (error: any) {
        console.error('Error fetching documents:', error);
        console.error('Error details:', error.response?.data);
        alert(`Error loading documents: ${error.response?.data?.detail || error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Filter documents based on search and category
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || doc.metadata.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories: string[] = ['all', ...new Set(documents.map((doc) => doc.metadata.category).filter((c): c is string => Boolean(c)))];

  // Get category counts
  const categoryCounts = documents.reduce((acc, doc) => {
    const category = doc.metadata.category || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (authLoading || !isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header onLoginClick={() => {}} onRegisterClick={() => {}} onMenuClick={() => {}} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Chat</span>
          </button>

          <Heading level={1} className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Knowledge Base Documents
          </Heading>
          <Text className="text-zinc-600 dark:text-zinc-400">
            View and manage all documents in the Pinecone vector database
          </Text>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <DatabaseIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Text className="!text-xs text-zinc-500 dark:text-zinc-400">Total Vectors</Text>
                  <Heading level={3} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.total_vectors.toLocaleString()}
                  </Heading>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Text className="!text-xs text-zinc-500 dark:text-zinc-400">Documents Loaded</Text>
                  <Heading level={3} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {documents.length.toLocaleString()}
                  </Heading>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{categories.length - 1}</span>
                </div>
                <div>
                  <Text className="!text-xs text-zinc-500 dark:text-zinc-400">Categories</Text>
                  <Heading level={3} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {categories.length - 1}
                  </Heading>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {category === 'all' ? 'All' : category}
                {category !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-75">({categoryCounts[category] || 0})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Text className="!text-sm text-zinc-600 dark:text-zinc-400">
                Showing {filteredDocuments.length} of {documents.length} documents
              </Text>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                <FileTextIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                <Text className="text-zinc-500 dark:text-zinc-400">No documents found</Text>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge color="zinc" className="!text-xs font-mono">
                          {doc.id}
                        </Badge>
                        {doc.metadata.category && (
                          <Badge color="indigo" className="!text-xs">
                            {doc.metadata.category}
                          </Badge>
                        )}
                      </div>

                      {doc.metadata.question && (
                        <Heading level={4} className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                          {doc.metadata.question}
                        </Heading>
                      )}

                      {doc.metadata.answer && (
                        <Text className="!text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 mb-2">
                          {doc.metadata.answer}
                        </Text>
                      )}

                      {doc.metadata.source && (
                        <a
                          href={doc.metadata.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {doc.metadata.source}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
