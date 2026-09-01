import { useEffect, useState } from 'react';
import { Sheet } from '@/ui/components';
import { confirmAction, toast } from '@/ui/feedback';
import type { Equipment, Exercise, MuscleGroup } from '@/domain/types';
import { MUSCLE_LABEL, MUSCLE_ORDER, EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '@/lib/labels';
import { nowISO } from '@/lib/id';
import { useAuth } from '@/store/authStore';
import { createCustomExercise } from '@/services/workoutService';
import { communityExerciseRepo, exerciseRepo } from '@/repositories/dexie';
import {
  hasUnuploadedMedia,
  updateCustomExerciseMedia,
} from '@/services/exerciseMediaUpload';
import {
  communityExerciseId,
  toCommunityExercise,
} from '@/services/communityExercise';

interface Props {
  exercise?: Exercise;
  published?: boolean;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
}

export function CustomExerciseSheet({ exercise, published, onClose, onSaved }: Props) {
  const user = useAuth((state) => state.user);
  const editing = Boolean(exercise);
  const [name, setName] = useState(exercise?.name ?? '');
  const [primary, setPrimary] = useState<MuscleGroup>(exercise?.primaryMuscle ?? 'peito');
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? 'maquina');
  const [instructions, setInstructions] = useState(
    exercise?.instructionsList?.join('\n') ?? exercise?.instructions ?? '',
  );
  const [startImage, setStartImage] = useState<File | null>(null);
  const [endImage, setEndImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [publish, setPublish] = useState(Boolean(published || exercise?.pendingPublication));
  const [saving, setSaving] = useState(false);
  const publicationReady = !editing || published !== undefined;

  useEffect(() => {
    if (published !== undefined) setPublish(published || Boolean(exercise?.pendingPublication));
  }, [published, exercise?.pendingPublication]);

  const currentMedia = exercise?.media;
  const currentImageCount = currentMedia?.type === 'image'
    ? (currentMedia.remoteUrls?.length ?? (currentMedia.remoteUrl || currentMedia.localUrl ? 1 : 0))
    : 0;

  async function save() {
    if (!name.trim()) { toast('Informe o nome'); return; }
    if (!user) { toast('Entre novamente para salvar o exercício'); return; }
    if (!publicationReady) { toast('Aguarde a situação da publicação carregar'); return; }
    if (published === true && !publish) {
      const confirmed = await confirmAction({
        title: 'Remover da comunidade?',
        message: 'O exercício deixará de receber novas inclusões por outros usuários. Sua cópia pessoal será mantida.',
        confirmLabel: 'Remover da comunidade',
        danger: true,
      });
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const base = exercise ?? createCustomExercise({
        authorId: user.id,
        authorName: user.name ?? null,
      });
      const media = await updateCustomExerciseMedia(base.id, base.media, {
        startImage,
        endImage,
        video,
      });
      const instructionsList = instructions
        .split(/\r?\n/)
        .map((step) => step.trim())
        .filter(Boolean);
      const pendingPublication = publish && hasUnuploadedMedia(media);
      const updated: Exercise = {
        ...base,
        name: name.trim(),
        primaryMuscle: primary,
        equipment,
        instructions: instructions.trim() || undefined,
        instructionsList,
        media,
        visibility: 'private',
        authorId: user.id,
        authorName: user.name ?? base.authorName ?? null,
        pendingPublication,
        updatedAt: nowISO(),
      };

      await exerciseRepo.put(updated);

      if (publish && !pendingPublication) {
        try {
          await communityExerciseRepo.put(toCommunityExercise(updated, user));
        } catch (error) {
          await exerciseRepo.put({ ...updated, pendingPublication: true });
          throw error;
        }
      } else if (!publish && published === true) {
        await communityExerciseRepo.remove(communityExerciseId(updated.id));
      }

      const action = editing ? 'atualizado' : 'criado';
      toast(
        pendingPublication
          ? `Exercício ${action}; conecte-se para publicar a nova mídia`
          : publish
            ? `Exercício ${action} e sincronização comunitária preparada`
            : `Exercício privado ${action}`,
      );
      onSaved(updated);
    } catch (error) {
      toast(error instanceof Error ? error.message : `Não foi possível ${editing ? 'atualizar' : 'criar'} o exercício`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={editing ? 'Editar meu exercício' : 'Criar meu exercício'}>
      <div className="stack">
        <div className="field"><label htmlFor="custom-exercise-name">Nome</label><input id="custom-exercise-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div>
        <div className="field">
          <label htmlFor="custom-exercise-primary">Músculo principal</label>
          <select id="custom-exercise-primary" className="select" value={primary} onChange={(event) => setPrimary(event.target.value as MuscleGroup)}>
            {MUSCLE_ORDER.map((muscle) => <option key={muscle} value={muscle}>{MUSCLE_LABEL[muscle]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="custom-exercise-equipment">Equipamento</label>
          <select id="custom-exercise-equipment" className="select" value={equipment} onChange={(event) => setEquipment(event.target.value as Equipment)}>
            {EQUIPMENT_ORDER.map((item) => <option key={item} value={item}>{EQUIPMENT_LABEL[item]}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="custom-exercise-instructions">Como executar</label><textarea id="custom-exercise-instructions" className="textarea" value={instructions} placeholder="Escreva um passo por linha..." onChange={(event) => setInstructions(event.target.value)} /></div>

        {editing && currentMedia && currentMedia.type !== 'none' && (
          <div className="custom-media-current">
            <strong>Mídia atual</strong>
            <span>{currentMedia.type === 'video' ? 'Vídeo da execução' : `${currentImageCount} imagem(ns) da execução`}</span>
            <small>Escolha um novo arquivo somente se quiser substituir ou completar a demonstração.</small>
          </div>
        )}

        <div className="custom-media-fields">
          <label><span>Imagem inicial</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setStartImage(event.target.files?.[0] ?? null)} /><small>{startImage?.name ?? (currentImageCount > 0 ? 'Imagem atual será mantida' : 'JPG, PNG, WebP ou GIF')}</small></label>
          <label><span>Imagem final</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setEndImage(event.target.files?.[0] ?? null)} /><small>{endImage?.name ?? (currentImageCount > 1 ? 'Imagem atual será mantida' : 'Opcional')}</small></label>
          <label className="custom-media-video"><span>Ou vídeo da execução</span><input type="file" accept="video/mp4,video/webm" onChange={(event) => setVideo(event.target.files?.[0] ?? null)} /><small>{video?.name ?? (currentMedia?.type === 'video' ? 'Vídeo atual será mantido' : 'MP4 ou WebM, até 15 MB')}</small></label>
        </div>
        <p className="faint" style={{ margin: '-6px 0 0', fontSize: 12 }}>Ao escolher um vídeo novo, ele passa a ser a demonstração principal no lugar das imagens.</p>

        <label className="publish-exercise-toggle"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /><span><strong>Disponibilizar para outros usuários</strong><small>Atualizações futuras usam o mesmo exercício e chegam a quem já o adicionou a um treino.</small></span></label>
        <button className="btn btn--primary btn--block" disabled={saving || !publicationReady} onClick={() => void save()}>
          {!publicationReady ? 'CARREGANDO PUBLICAÇÃO...' : saving ? 'SALVANDO...' : publish ? (editing ? 'SALVAR E ATUALIZAR' : 'SALVAR E PUBLICAR') : 'SALVAR EXERCÍCIO'}
        </button>
      </div>
    </Sheet>
  );
}
