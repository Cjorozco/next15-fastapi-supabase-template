import { ProjectDetailClient } from '@/components/ProjectDetailClient';
import { Id } from '../../../../convex/_generated/dataModel';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailClient projectId={id as Id<'projects'>} />;
}
