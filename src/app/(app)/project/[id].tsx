import { useLocalSearchParams } from 'expo-router';

import { ProjectScreen } from '@/features/projects/ProjectScreen';

export default function ProjectRoute() {
  // generate=1 : projet tout juste créé, l'agent Idées démarre à l'ouverture
  const { id, generate } = useLocalSearchParams<{ id: string; generate?: string }>();
  return <ProjectScreen id={id} autoGenerate={generate === '1'} />;
}
