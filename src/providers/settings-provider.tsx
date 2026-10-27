import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Что открывать при запуске: глобус, список городов, конкретный город или плейлист (избранные станции). */
export type StartPage = "cities" | "list" | "city" | "playlist";

export type Settings = {
  name: string;
  startPage: StartPage;
  startCityId: string | null;
};

type SettingsContextValue = Settings & {
  /** Настройки прочитаны из хранилища. */
  ready: boolean;
  setName: (name: string) => void;
  setStartPage: (startPage: StartPage) => void;
  setStartCityId: (cityId: string | null) => void;
};

const STORAGE_KEY = "settings.v1";

const DEFAULTS: Settings = {
  name: "",
  startPage: "cities",
  startCityId: null,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function isStartPage(value: unknown): value is StartPage {
  return (
    value === "cities" ||
    value === "list" ||
    value === "city" ||
    value === "playlist"
  );
}

async function load(): Promise<Settings> {
  try {
    const json = await Storage.getItemAsync(STORAGE_KEY);
    if (!json) return DEFAULTS;
    const parsed: Partial<Settings> = JSON.parse(json);
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULTS.name,
      startPage: isStartPage(parsed.startPage)
        ? parsed.startPage
        : DEFAULTS.startPage,
      startCityId:
        typeof parsed.startCityId === "string" ? parsed.startCityId : null,
    };
  } catch (e) {
    console.warn("Не удалось прочитать настройки", e);
    return DEFAULTS;
  }
}

function persist(settings: Settings): void {
  Storage.setItemAsync(STORAGE_KEY, JSON.stringify(settings)).catch(
    (e: unknown) => {
      console.warn("Не удалось сохранить настройки", e);
    },
  );
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const setName = useCallback((name: string) => update({ name }), [update]);
  const setStartPage = useCallback(
    (startPage: StartPage) => update({ startPage }),
    [update],
  );
  const setStartCityId = useCallback(
    (startCityId: string | null) => update({ startCityId }),
    [update],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ ...settings, ready, setName, setStartPage, setStartCityId }),
    [settings, ready, setName, setStartPage, setStartCityId],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return ctx;
}
