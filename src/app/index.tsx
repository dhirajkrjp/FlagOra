import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchCountries,
  type Country,
} from "../../data/countries";
import { preloadFlagImages } from "../utils/flagImages";

type Mode = "easy" | "hard";
type Question = { answer: Country; choices: Country[] };
type Feedback = { isCorrect: boolean; answer: string } | null;

const QUESTION_COUNT = 10;
const ORBITAL_FLAGS = [
  { code: "gb", emoji: "🇬🇧" },
  { code: "jp", emoji: "🇯🇵" },
  { code: "us", emoji: "🇺🇸" },
  { code: "fr", emoji: "🇫🇷" },
  { code: "br", emoji: "🇧🇷" },
  { code: "in", emoji: "🇮🇳" },
];

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createQuestions(countries: Country[]): Question[] {
  return shuffle(countries)
    .slice(0, QUESTION_COUNT)
    .map((answer) => ({
      answer,
      choices: shuffle([
        answer,
        ...shuffle(countries.filter((country) => country !== answer)).slice(
          0,
          3,
        ),
      ]),
    }));
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function Index() {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [countryLoad, setCountryLoad] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; countries: Country[] }
  >({ status: "loading" });
  const [mode, setMode] = useState<Mode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [failedFlagCode, setFailedFlagCode] = useState<string | null>(null);
  const [orbitRotation] = useState(() => new Animated.Value(0));
  const [preparingMode, setPreparingMode] = useState<Mode | null>(null);

  useEffect(() => {
    let active = true;

    fetchCountries()
      .then((countries) => {
        if (active) {
          const featuredFlagUrls = ORBITAL_FLAGS.flatMap(({ code }) => {
            const country = countries.find((entry) => entry.code === code);
            return country ? [country.flag] : [];
          });
          void preloadFlagImages(featuredFlagUrls);
          setCountryLoad({ status: "ready", countries });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCountryLoad({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (mode !== null) return;

    const orbit = Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    orbit.start();

    return () => orbit.stop();
  }, [mode, orbitRotation]);

  const orbitalFlags = useMemo(
    () =>
      ORBITAL_FLAGS.map(({ code, emoji }) => ({
        code,
        emoji,
        country:
          countryLoad.status === "ready"
            ? countryLoad.countries.find((entry) => entry.code === code)
            : undefined,
      })),
    [countryLoad],
  );
  const orbitAngle = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const counterOrbitAngle = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });
  const orbitFlagPositions = [
    { top: 0, left: "50%", marginLeft: -19 },
    { top: 36, right: 0 },
    { bottom: 36, right: 0 },
    { bottom: 0, left: "50%", marginLeft: -19 },
    { bottom: 36, left: 0 },
    { top: 36, left: 0 },
  ];

  async function startQuiz(nextMode: Mode) {
    if (countryLoad.status !== "ready" || preparingMode !== null) return;

    const nextQuestions = createQuestions(countryLoad.countries);
    setPreparingMode(nextMode);

    try {
      await preloadFlagImages([nextQuestions[0].answer.flag]);
      void preloadFlagImages(
        nextQuestions.slice(1).map((nextQuestion) => nextQuestion.answer.flag),
      );
      setQuestions(nextQuestions);
      setMode(nextMode);
      setQuestionIndex(0);
      setScore(0);
      setGuess("");
      setFeedback(null);
      setIsComplete(false);
      setFailedFlagCode(null);
    } finally {
      setPreparingMode(null);
    }
  }

  function changeMode() {
    setMode(null);
    setFeedback(null);
    setIsComplete(false);
  }

  const question = questions[questionIndex];

  function submitAnswer(answer: string) {
    if (!question || feedback !== null) return;

    const isCorrect =
      normalizeAnswer(question.answer.country) === normalizeAnswer(answer);

    setFeedback({ isCorrect, answer });
    if (isCorrect) setScore((currentScore) => currentScore + 1);
    Keyboard.dismiss();
  }

  function goToNextQuestion() {
    if (questionIndex === questions.length - 1) {
      setIsComplete(true);
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex + 1);
    setGuess("");
    setFeedback(null);
  }

  if (mode === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GameBackdrop />
        <ScrollView contentContainerStyle={styles.homeContent}>
          <BrandHeader />
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>A WORLD OF FLAGS AWAITS</Text>
            <Text style={styles.title}>
              Know the world.{"\n"}
              <Text style={styles.titleAccent}>Play the quiz.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Read the flag. Trust your instincts. See how far you can travel.
            </Text>
          </View>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={["#123E91", "#0A2056", "#07143A"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTopline}>
              <Text style={styles.heroEyebrow}>YOUR NEXT DESTINATION</Text>
              <Text style={styles.heroPlane}>✈</Text>
            </View>
            <View style={styles.globeStage}>
              <View style={styles.globeOrbit} />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.flagOrbit,
                  { transform: [{ rotate: orbitAngle }] },
                ]}
              >
                {orbitalFlags.map((flag, index) => (
                  <View
                    key={flag.code}
                    style={[
                      styles.orbitFlagSlot,
                      orbitFlagPositions[index],
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.flagChip,
                        { transform: [{ rotate: counterOrbitAngle }] },
                      ]}
                    >
                      {flag.country ? (
                        <Image
                          accessibilityLabel={`Flag of ${flag.country.country}`}
                          cachePolicy="memory-disk"
                          contentFit="contain"
                          source={{ uri: flag.country.flag }}
                          style={styles.flagChipImage}
                          transition={150}
                        />
                      ) : (
                        <Text style={styles.flagChipText}>{flag.emoji}</Text>
                      )}
                    </Animated.View>
                  </View>
                ))}
              </Animated.View>
              <Text style={styles.heroGlobe}>🌍</Text>
            </View>
            <View style={styles.heroBottomline}>
              <View>
                <Text style={styles.heroTitle}>THE WORLD IS YOURS</Text>
                <Text style={styles.heroCaption}>
                  {countryLoad.status === "ready"
                    ? `${countryLoad.countries.length} flags · 10 questions`
                    : "10 flags · One great adventure"}
                </Text>
              </View>
              <Link href="/countries" asChild>
                <Pressable
                  accessibilityLabel="Explore all countries"
                  accessibilityRole="button"
                  style={styles.heroArrow}
                >
                  <Text style={styles.heroArrowText}>↗</Text>
                </Pressable>
              </Link>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Choose your level</Text>
          {countryLoad.status === "loading" && (
            <Text style={styles.loadMessage}>Loading country flags...</Text>
          )}
          {countryLoad.status === "error" && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Country data is unavailable</Text>
              <Text style={styles.errorMessage}>{countryLoad.message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCountryLoad({ status: "loading" });
                  setLoadAttempt((attempt) => attempt + 1);
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          )}
          {countryLoad.status === "ready" && (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={preparingMode !== null}
                onPress={() => void startQuiz("easy")}
                style={[styles.modeCard, styles.easyCard]}
              >
                <LinearGradient
                  colors={["#1255A8", "#0B3476", "#0A2559"]}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.modeIcon, styles.easyIcon]}>
                  <Text style={styles.modeEmoji}>🧭</Text>
                </View>
                <View style={styles.modeCopy}>
                  <View style={styles.modeTitleRow}>
                    <Text style={styles.modeTitle}>Easy mode</Text>
                    <Text style={[styles.levelBadge, styles.easyBadge]}>
                      BEGINNER
                    </Text>
                  </View>
                  <Text style={styles.modeDescription}>
                    Spot the flag. Pick the right country from four choices.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={preparingMode !== null}
                onPress={() => void startQuiz("hard")}
                style={[styles.modeCard, styles.hardCard]}
              >
                <LinearGradient
                  colors={["#253B82", "#152858", "#101D45"]}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.modeIcon, styles.hardIcon]}>
                  <Text style={styles.modeEmoji}>✍️</Text>
                </View>
                <View style={styles.modeCopy}>
                  <View style={styles.modeTitleRow}>
                    <Text style={styles.modeTitle}>Hard mode</Text>
                    <Text style={[styles.levelBadge, styles.hardBadge]}>
                      CHALLENGE
                    </Text>
                  </View>
                  <Text style={styles.modeDescription}>
                    No options this time. Name the country from its flag.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {preparingMode !== null && (
                <Text style={styles.loadMessage}>
                  Preparing your first flag...
                </Text>
              )}
            </>
          )}
          <View style={styles.homeFooter}>
            <Text style={styles.footerEmoji}>🌍</Text>
            <Text style={styles.footerText}>Know the world. Play the quiz.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isComplete || !question) {
    const resultTitle =
      score >= 8 ? "Outstanding!" : score >= 5 ? "Nice work!" : "Keep exploring!";

    return (
      <SafeAreaView style={styles.safeArea}>
        <GameBackdrop />
        <ScrollView contentContainerStyle={styles.resultContent}>
          <BrandHeader onChangeMode={changeMode} />
          <View style={styles.resultCard}>
            <LinearGradient
              colors={["#10295F", "#0A1941", "#07112F"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.resultEmoji}>🏆</Text>
            <Text style={styles.resultEyebrow}>QUIZ COMPLETE</Text>
            <Text style={styles.resultTitle}>
              {score === QUESTION_COUNT ? "Perfect round!" : "Level complete!"}
            </Text>
            <Text style={styles.resultRank}>{resultTitle}</Text>
            <Text style={styles.resultSubtitle}>
              {mode === "easy" ? "Easy mode" : "Hard mode"} · You made it around
              the world!
            </Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={styles.scoreTotal}>OUT OF {QUESTION_COUNT}</Text>
            </View>
            <Text style={styles.resultMessage}>
              {score === QUESTION_COUNT
                ? "Perfect score. You really know your flags!"
                : `${QUESTION_COUNT - score} more ${
                    QUESTION_COUNT - score === 1 ? "flag" : "flags"
                  } to learn. Ready for another round?`}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={preparingMode !== null}
              onPress={() => void startQuiz(mode)}
              style={styles.primaryButton}
            >
              <LinearGradient
                colors={["#FFE56D", "#FFC52E", "#F5A900"]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.primaryButtonText}>
                {preparingMode === null ? "Play again" : "Preparing flags..."}
              </Text>
              <Text style={styles.primaryButtonArrow}>↗</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={preparingMode !== null}
              onPress={changeMode}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Choose another mode</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const progress = ((questionIndex + (feedback ? 1 : 0)) / QUESTION_COUNT) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameBackdrop />
      <ScrollView
        contentContainerStyle={styles.quizContent}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader onChangeMode={changeMode} />
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.eyebrow}>
              {mode === "easy" ? "EASY MODE" : "HARD MODE"} · WORLD TOUR
            </Text>
            <Text style={styles.questionCount}>
              LEVEL {questionIndex + 1}
              <Text style={styles.questionTotal}> / {QUESTION_COUNT}</Text>
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreStar}>★</Text>
            <Text style={styles.scorePillText}>{score}</Text>
          </View>
        </View>
        <View
          accessibilityLabel={`Quiz progress ${Math.round(progress)} percent`}
          accessibilityRole="progressbar"
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.flagCard}>
          <LinearGradient
            colors={["#102A61", "#0A1B43", "#081432"]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.flagLabel}>WHICH COUNTRY HAS THIS FLAG?</Text>
          {failedFlagCode === question.answer.code ? (
            <View style={styles.flagUnavailable}>
              <Text style={styles.flagUnavailableCode}>
                {question.answer.code.toUpperCase()}
              </Text>
              <Text style={styles.flagUnavailableText}>
                Flag image could not be loaded
              </Text>
            </View>
          ) : (
            <Image
              accessibilityLabel={`Flag of ${question.answer.country}`}
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={() => setFailedFlagCode(question.answer.code)}
              priority="high"
              source={{ uri: question.answer.flag }}
              style={styles.flagImage}
              transition={150}
            />
          )}
          <Text style={styles.flagHint}>
            {mode === "easy"
              ? "Choose the country below"
              : "Type the country name from memory"}
          </Text>
        </View>
        {mode === "easy" ? (
          <View style={styles.answers}>
            {question.choices.map((choice, index) => {
              const isSelected = feedback?.answer === choice.country;
              const isCorrectChoice =
                choice.code === question.answer.code;
              const isRight = feedback !== null && isCorrectChoice;
              const isWrong = feedback !== null && isSelected && !isCorrectChoice;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: feedback !== null }}
                  disabled={feedback !== null}
                  key={choice.code}
                  onPress={() => submitAnswer(choice.country)}
                  style={[
                    styles.answerOption,
                    isRight && styles.answerOptionCorrect,
                    isWrong && styles.answerOptionWrong,
                  ]}
                >
                  <Text style={styles.optionLetter}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                  <Text style={styles.answerText}>{choice.country}</Text>
                  {isRight && <Text style={styles.answerMark}>✓</Text>}
                  {isWrong && <Text style={styles.answerMark}>×</Text>}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.hardAnswer}>
            <Text style={styles.inputLabel}>YOUR ANSWER</Text>
            <TextInput
              accessibilityLabel="Type the country name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={feedback === null}
              onChangeText={setGuess}
              onSubmitEditing={() => submitAnswer(guess)}
              placeholder="Type a country name..."
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={styles.textInput}
              value={guess}
            />
            {feedback === null ? (
              <Pressable
                accessibilityRole="button"
                disabled={!guess.trim()}
                onPress={() => submitAnswer(guess)}
                style={[
                  styles.primaryButton,
                  !guess.trim() && styles.primaryButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={["#FFE56D", "#FFC52E", "#F5A900"]}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.primaryButtonText}>Check answer</Text>
                <Text style={styles.primaryButtonArrow}>↗</Text>
              </Pressable>
            ) : (
              <AnswerFeedback feedback={feedback} country={question.answer} />
            )}
          </View>
        )}
        {mode === "easy" && feedback !== null && (
          <AnswerFeedback feedback={feedback} country={question.answer} />
        )}
        {feedback !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={goToNextQuestion}
            style={[styles.primaryButton, styles.nextButton]}
          >
            <LinearGradient
              colors={["#FFE56D", "#FFC52E", "#F5A900"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.primaryButtonText}>
              {questionIndex === QUESTION_COUNT - 1
                ? "See my score"
                : "Next question"}
            </Text>
            <Text style={styles.primaryButtonArrow}>→</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BrandHeader({ onChangeMode }: { onChangeMode?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <LinearGradient
          colors={["#35B5FF", "#2258D9", "#6F4DFF"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.brandIcon}
        >
          <Text style={styles.brandEmoji}>🌍</Text>
        </LinearGradient>
        <Text style={styles.brandName}>FlagOra</Text>
      </View>
      {onChangeMode && (
        <Pressable
          accessibilityRole="button"
          onPress={onChangeMode}
          style={styles.changeModeButton}
        >
          <Text style={styles.changeModeText}>Change mode</Text>
        </Pressable>
      )}
    </View>
  );
}

function AnswerFeedback({
  feedback,
  country,
}: {
  feedback: NonNullable<Feedback>;
  country: Country;
}) {
  return (
    <LinearGradient
      accessibilityLiveRegion="polite"
      colors={
        feedback.isCorrect
          ? ["#0C3D3B", "#0A2D35"]
          : ["#4A263B", "#311E39"]
      }
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[
        styles.feedbackBox,
        feedback.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
      ]}
    >
      <Text style={styles.feedbackIcon}>
        {feedback.isCorrect ? "✓" : "↻"}
      </Text>
      <View style={styles.feedbackCopy}>
        <Text style={styles.feedbackTitle}>
          {feedback.isCorrect ? "That’s right!" : "Not quite"}
        </Text>
        <Text style={styles.feedbackText}>
          {feedback.isCorrect
            ? "Great flag knowledge."
            : `This flag belongs to ${country.country}.`}
        </Text>
      </View>
    </LinearGradient>
  );
}

function GameBackdrop() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.backdropClip]}
    >
      <LinearGradient
        colors={["#03091F", "#07163D", "#06102E"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orbitGlow, styles.orbitGlowTop]} />
      <View style={[styles.orbitGlow, styles.orbitGlowBottom]} />
      <View style={[styles.backgroundStar, styles.backgroundStarOne]} />
      <View style={[styles.backgroundStar, styles.backgroundStarTwo]} />
      <View style={[styles.backgroundStar, styles.backgroundStarThree]} />
    </View>
  );
}

const colors = {
  background: "#03091F",
  ink: "#F7F9FF",
  muted: "#A8B6D8",
  green: "#35D88B",
  greenDark: "#16B96F",
  greenPale: "rgba(53, 216, 139, 0.16)",
  orangePale: "rgba(255, 207, 54, 0.14)",
  orange: "#FFD34D",
  white: "#F7F9FF",
  blue: "#55C6FF",
  blueDark: "#123C83",
  gold: "#FFD447",
  goldDeep: "#F5A900",
  red: "#FF8994",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdropClip: {
    overflow: "hidden",
  },
  homeContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  quizContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  resultContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(120, 203, 255, 0.6)",
  },
  brandEmoji: {
    fontSize: 23,
  },
  brandName: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  changeModeButton: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(117, 171, 255, 0.35)",
    borderRadius: 13,
    backgroundColor: "rgba(20, 45, 99, 0.72)",
  },
  changeModeText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "700",
  },
  intro: {
    marginTop: 6,
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  title: {
    maxWidth: 430,
    marginTop: 10,
    color: colors.ink,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 41,
    letterSpacing: -0.8,
  },
  titleAccent: {
    color: colors.gold,
  },
  subtitle: {
    maxWidth: 380,
    marginTop: 9,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    position: "relative",
    minHeight: 248,
    overflow: "hidden",
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(93, 179, 255, 0.45)",
    borderRadius: 25,
    backgroundColor: "#0A1D48",
  },
  heroTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyebrow: {
    color: "#BEDBFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  heroPlane: {
    color: colors.gold,
    fontSize: 21,
    transform: [{ rotate: "-12deg" }],
  },
  globeStage: {
    height: 184,
    alignItems: "center",
    justifyContent: "center",
  },
  globeOrbit: {
    position: "absolute",
    width: 148,
    height: 148,
    left: "50%",
    top: "50%",
    marginLeft: -74,
    marginTop: -74,
    borderWidth: 1,
    borderColor: "rgba(85, 198, 255, 0.82)",
    borderRadius: 74,
  },
  flagOrbit: {
    position: "absolute",
    width: 184,
    height: 184,
    left: "50%",
    top: "50%",
    marginLeft: -92,
    marginTop: -92,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitFlagSlot: {
    position: "absolute",
  },
  heroGlobe: {
    fontSize: 82,
    lineHeight: 100,
    textShadowColor: "rgba(46, 159, 255, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  flagChip: {
    width: 38,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(135, 192, 255, 0.65)",
    borderRadius: 12,
    backgroundColor: "#102A62",
    shadowColor: "#53B9FF",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  flagChipText: {
    fontSize: 18,
  },
  flagChipImage: {
    width: 25,
    height: 18,
    borderRadius: 2,
  },
  heroBottomline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  heroCaption: {
    marginTop: 5,
    color: "#BED0F3",
    fontSize: 11,
    fontWeight: "600",
  },
  heroArrow: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.gold,
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  heroArrowText: {
    color: "#071337",
    fontSize: 21,
    fontWeight: "800",
  },
  sectionTitle: {
    marginBottom: 11,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  modeCard: {
    position: "relative",
    minHeight: 91,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderRadius: 19,
  },
  easyCard: {
    borderColor: "rgba(85, 198, 255, 0.52)",
    backgroundColor: "#0A2E69",
  },
  hardCard: {
    borderColor: "rgba(147, 161, 255, 0.38)",
    backgroundColor: "#151F4C",
  },
  modeIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  easyIcon: {
    borderColor: "rgba(113, 204, 255, 0.52)",
    backgroundColor: "rgba(61, 157, 255, 0.2)",
  },
  hardIcon: {
    borderColor: "rgba(255, 214, 85, 0.5)",
    backgroundColor: "rgba(255, 190, 41, 0.16)",
  },
  modeEmoji: {
    fontSize: 23,
  },
  modeCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  modeTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  levelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  easyBadge: {
    color: "#9DE0FF",
    backgroundColor: "rgba(69, 169, 255, 0.2)",
  },
  hardBadge: {
    color: colors.gold,
    backgroundColor: colors.orangePale,
  },
  modeDescription: {
    marginTop: 6,
    color: "#C2D0EE",
    fontSize: 12,
    lineHeight: 17,
  },
  chevron: {
    color: colors.gold,
    fontSize: 27,
    lineHeight: 30,
  },
  homeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "auto",
    paddingTop: 24,
  },
  footerEmoji: {
    fontSize: 17,
  },
  footerText: {
    color: "#B5C3E2",
    fontSize: 12,
    fontWeight: "600",
  },
  loadMessage: {
    paddingVertical: 22,
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  errorCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 137, 148, 0.4)",
    borderRadius: 18,
    backgroundColor: "rgba(104, 34, 57, 0.35)",
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  errorMessage: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: colors.blueDark,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  questionCount: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  questionTotal: {
    color: "#8294BC",
    fontSize: 16,
    fontWeight: "600",
  },
  scorePill: {
    minWidth: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 210, 71, 0.32)",
    borderRadius: 15,
    backgroundColor: "rgba(30, 43, 91, 0.9)",
  },
  scoreStar: {
    color: colors.gold,
    fontSize: 16,
  },
  scorePillText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    marginBottom: 18,
    borderRadius: 6,
    backgroundColor: "rgba(118, 151, 212, 0.22)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: colors.gold,
  },
  flagCard: {
    position: "relative",
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 20,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "rgba(92, 178, 255, 0.42)",
    borderRadius: 24,
    backgroundColor: "#0A1C45",
  },
  flagLabel: {
    color: "#AFCAFA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  flagImage: {
    width: 190,
    height: 130,
    marginTop: 17,
  },
  flagUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    width: 190,
    height: 130,
    marginTop: 17,
  },
  flagUnavailableCode: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2,
  },
  flagUnavailableText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
  },
  flagHint: {
    marginTop: 10,
    color: "#A9BBDE",
    fontSize: 12,
    textAlign: "center",
  },
  answers: {
    gap: 10,
  },
  answerOption: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(94, 151, 235, 0.4)",
    borderRadius: 16,
    backgroundColor: "rgba(10, 31, 76, 0.94)",
  },
  answerOptionCorrect: {
    borderColor: colors.green,
    backgroundColor: "rgba(10, 78, 57, 0.96)",
  },
  answerOptionWrong: {
    borderColor: colors.red,
    backgroundColor: "rgba(88, 34, 57, 0.94)",
  },
  optionLetter: {
    width: 30,
    height: 30,
    overflow: "hidden",
    borderRadius: 10,
    color: colors.gold,
    backgroundColor: "rgba(69, 138, 241, 0.22)",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 30,
    textAlign: "center",
  },
  answerText: {
    flex: 1,
    marginLeft: 12,
    color: "#F2F6FF",
    fontSize: 15,
    fontWeight: "700",
  },
  answerMark: {
    marginHorizontal: 5,
    color: colors.green,
    fontSize: 20,
    fontWeight: "800",
  },
  hardAnswer: {
    gap: 12,
  },
  inputLabel: {
    color: "#AFC0E6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  textInput: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(93, 163, 243, 0.45)",
    borderRadius: 16,
    color: colors.ink,
    backgroundColor: "rgba(10, 29, 68, 0.96)",
    fontSize: 16,
  },
  primaryButton: {
    position: "relative",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 230, 131, 0.9)",
    borderRadius: 17,
    backgroundColor: colors.gold,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#081638",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButtonArrow: {
    color: "#081638",
    fontSize: 18,
    fontWeight: "700",
  },
  feedbackBox: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  feedbackCorrect: {
    borderColor: "rgba(53, 216, 139, 0.6)",
  },
  feedbackWrong: {
    borderColor: "rgba(255, 137, 148, 0.55)",
  },
  feedbackIcon: {
    width: 30,
    height: 30,
    marginRight: 11,
    borderRadius: 10,
    color: colors.gold,
    backgroundColor: "rgba(247, 249, 255, 0.1)",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 30,
    textAlign: "center",
  },
  feedbackCopy: {
    flex: 1,
  },
  feedbackTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  feedbackText: {
    marginTop: 3,
    color: "#BDCAE4",
    fontSize: 12,
    lineHeight: 17,
  },
  nextButton: {
    marginTop: 14,
  },
  resultCard: {
    position: "relative",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "rgba(89, 169, 255, 0.43)",
    borderRadius: 27,
    backgroundColor: "#0A1941",
  },
  resultEmoji: {
    marginBottom: 12,
    fontSize: 62,
    textShadowColor: "rgba(255, 196, 43, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  resultEyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  resultTitle: {
    marginTop: 9,
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  resultRank: {
    marginTop: 5,
    color: colors.blue,
    fontSize: 14,
    fontWeight: "700",
  },
  resultSubtitle: {
    marginTop: 8,
    color: "#B4C3E1",
    fontSize: 13,
    textAlign: "center",
  },
  scoreCircle: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
    borderWidth: 7,
    borderColor: colors.gold,
    borderRadius: 74,
    backgroundColor: "rgba(39, 72, 143, 0.55)",
    shadowColor: colors.blue,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  scoreValue: {
    color: colors.ink,
    fontSize: 47,
    fontWeight: "800",
    lineHeight: 52,
  },
  scoreTotal: {
    marginTop: 2,
    color: "#C0D0F1",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  resultMessage: {
    maxWidth: 270,
    marginBottom: 22,
    color: "#B4C3E1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  secondaryButton: {
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: "#D3DDF3",
    fontSize: 14,
    fontWeight: "700",
  },
  orbitGlow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: "rgba(70, 134, 255, 0.11)",
    borderRadius: 125,
  },
  orbitGlowTop: {
    top: -135,
    right: -120,
  },
  orbitGlowBottom: {
    bottom: -180,
    left: -140,
    width: 330,
    height: 330,
    borderRadius: 165,
  },
  backgroundStar: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E5F2FF",
    shadowColor: "#77C8FF",
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  backgroundStarOne: {
    top: "12%",
    right: "13%",
  },
  backgroundStarTwo: {
    top: "42%",
    left: "7%",
    width: 2,
    height: 2,
  },
  backgroundStarThree: {
    right: "9%",
    bottom: "19%",
    width: 2,
    height: 2,
  },
});
