import { Beaver } from "@/components/beaver";
import type { CharacterProps } from "@/components/dance-rig";
import { Platypus } from "@/components/platypus";
import { useSettings, type Character as CharacterId } from "@/providers/settings-provider";

type Props = CharacterProps & {
  /** Какого персонажа рисовать; без него — выбранного в настройках. */
  character?: CharacterId;
};

/** Персонаж с магнитофоном: бобёр или утконос, по выбору в профиле. */
export function Character({ character, ...props }: Props) {
  const settings = useSettings();
  const id = character ?? settings.character;
  return id === "platypus" ? <Platypus {...props} /> : <Beaver {...props} />;
}
