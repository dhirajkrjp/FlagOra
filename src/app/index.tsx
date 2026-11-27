import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  COUNTRY_DATA_URL,
  fetchCountries,
  type Country,
} from "../../data/countries";

type Mode = "easy" | "hard";
type Question = { answer: Country; choices: Country[] };
type Feedback = { isCorrect: boolean; answer: string } | null;

const QUESTION_COUNT = 10;

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

  useEffect(() => {
    let active = true;

    fetchCountries()
      .then((countries) => {
        if (active) setCountryLoad({ status: "ready", countries });
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

  function startQuiz(nextMode: Mode) {
    if (countryLoad.status !== "ready") return;

    setMode(nextMode);
    setQuestions(createQuestions(countryLoad.countries));
    setQuestionIndex(0);
    setScore(0);
    setGuess("");
    setFeedback(null);
    setIsComplete(false);
    setFailedFlagCode(null);
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
        <ScrollView contentContainerStyle={styles.homeContent}>
          <BrandHeader />
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>YOUR DAILY DOSE OF DISCOVERY</Text>
            <Text style={styles.title}>How well do you know the world?</Text>
            <Text style={styles.subtitle}>
              Take a quick trip around the globe, one flag at a time.
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Choose your challenge</Text>
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
                onPress={() => startQuiz("easy")}
                style={[styles.modeCard, styles.easyCard]}
              >
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
                    Spot the flag and pick the right country from four choices.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => startQuiz("hard")}
                style={[styles.modeCard, styles.hardCard]}
              >
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
                    No hints this time. Type the country name from memory.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </>
          )}
          <View style={styles.homeFooter}>
            <Text style={styles.footerEmoji}>🌍</Text>
            <Text style={styles.footerText}>10 flags. One great adventure.</Text>
          </View>
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              Country data:{" "}
              <Link href={COUNTRY_DATA_URL} style={styles.attributionLink}>
                gedhiraj/Country
              </Link>
            </Text>
            <Text style={styles.attributionText}>
              Flag art by Twitter and contributors,{" "}
              <Link
                href="https://creativecommons.org/licenses/by/4.0/"
                style={styles.attributionLink}
              >
                Twemoji CC BY 4.0
              </Link>
            </Text>
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
        <ScrollView contentContainerStyle={styles.resultContent}>
          <BrandHeader onChangeMode={changeMode} />
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>
              {score >= 8 ? "🏆" : score >= 5 ? "🌟" : "🌱"}
            </Text>
            <Text style={styles.resultEyebrow}>QUIZ COMPLETE</Text>
            <Text style={styles.resultTitle}>{resultTitle}</Text>
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
              onPress={() => startQuiz(mode)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Play again</Text>
              <Text style={styles.primaryButtonArrow}>↗</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
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
      <ScrollView
        contentContainerStyle={styles.quizContent}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader onChangeMode={changeMode} />
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.eyebrow}>
              {mode === "easy" ? "EASY MODE" : "HARD MODE"}
            </Text>
            <Text style={styles.questionCount}>
              QUESTION {String(questionIndex + 1).padStart(2, "0")}
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
          <Text style={styles.flagLabel}>WHICH COUNTRY IS THIS?</Text>
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
              cachePolicy="disk"
              contentFit="contain"
              onError={() => setFailedFlagCode(question.answer.code)}
              source={{ uri: question.answer.flag }}
              style={styles.flagImage}
              transition={150}
            />
          )}
          <Text style={styles.flagHint}>
            {mode === "easy"
              ? "Choose the country this flag belongs to"
              : "Think carefully and type your answer"}
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
        <View style={styles.brandIcon}>
          <Text style={styles.brandEmoji}>🌍</Text>
        </View>
        <Text style={styles.brandName}>Flagora</Text>
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
    <View
      accessibilityLiveRegion="polite"
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
    </View>
  );
}

const colors = {
  background: "#F5F7F1",
  ink: "#1C2D26",
  muted: "#77827B",
  green: "#247A59",
  greenDark: "#1B6548",
  greenPale: "#E8F3EC",
  orangePale: "#FFF1E3",
  orange: "#B56323",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
  },
  quizContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
  },
  resultContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenPale,
  },
  brandEmoji: {
    fontSize: 21,
  },
  brandName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  changeModeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  changeModeText: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: "700",
  },
  intro: {
    marginTop: 16,
    marginBottom: 30,
  },
  eyebrow: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    maxWidth: 350,
    marginTop: 12,
    color: colors.ink,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 39,
    letterSpacing: -1,
  },
  subtitle: {
    maxWidth: 330,
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  sectionTitle: {
    marginBottom: 12,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 22,
  },
  easyCard: {
    backgroundColor: colors.white,
    borderColor: "#E7EDE7",
  },
  hardCard: {
    backgroundColor: "#FFFCF8",
    borderColor: "#F1E8DC",
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  easyIcon: {
    backgroundColor: colors.greenPale,
  },
  hardIcon: {
    backgroundColor: colors.orangePale,
  },
  modeEmoji: {
    fontSize: 23,
  },
  modeCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  modeTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  levelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  easyBadge: {
    color: colors.greenDark,
    backgroundColor: colors.greenPale,
  },
  hardBadge: {
    color: colors.orange,
    backgroundColor: colors.orangePale,
  },
  modeDescription: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  chevron: {
    color: "#A0AAA3",
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
    color: colors.muted,
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
    borderColor: "#E7D7D1",
    borderRadius: 18,
    backgroundColor: "#FFF7F4",
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
    backgroundColor: colors.green,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  attribution: {
    alignItems: "center",
    gap: 4,
    paddingTop: 16,
  },
  attributionText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
  },
  attributionLink: {
    color: colors.greenDark,
    textDecorationLine: "underline",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  questionCount: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  questionTotal: {
    color: colors.muted,
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
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  scoreStar: {
    color: "#E7A936",
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
    marginBottom: 20,
    borderRadius: 6,
    backgroundColor: "#E5EAE4",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: colors.green,
  },
  flagCard: {
    minHeight: 226,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E9EDE8",
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  flagLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  flagImage: {
    width: 150,
    height: 100,
    marginTop: 18,
  },
  flagUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    width: 150,
    height: 100,
    marginTop: 18,
  },
  flagUnavailableCode: {
    color: colors.ink,
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
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
  answers: {
    gap: 10,
  },
  answerOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#E7EDE7",
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  answerOptionCorrect: {
    borderColor: "#76B58F",
    backgroundColor: colors.greenPale,
  },
  answerOptionWrong: {
    borderColor: "#E5A294",
    backgroundColor: "#FFF0EC",
  },
  optionLetter: {
    width: 30,
    height: 30,
    overflow: "hidden",
    borderRadius: 10,
    color: colors.greenDark,
    backgroundColor: colors.greenPale,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 30,
    textAlign: "center",
  },
  answerText: {
    flex: 1,
    marginLeft: 12,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  answerMark: {
    marginHorizontal: 5,
    color: colors.greenDark,
    fontSize: 20,
    fontWeight: "800",
  },
  hardAnswer: {
    gap: 12,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  textInput: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E3E9E2",
    borderRadius: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: colors.green,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButtonArrow: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginTop: 14,
    borderRadius: 16,
  },
  feedbackCorrect: {
    backgroundColor: colors.greenPale,
  },
  feedbackWrong: {
    backgroundColor: "#FFF0EC",
  },
  feedbackIcon: {
    width: 30,
    height: 30,
    marginRight: 11,
    borderRadius: 10,
    color: colors.greenDark,
    backgroundColor: colors.white,
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
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  nextButton: {
    marginTop: 14,
    backgroundColor: colors.greenDark,
  },
  resultCard: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#E8EDE7",
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  resultEmoji: {
    marginBottom: 12,
    fontSize: 50,
  },
  resultEyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  resultTitle: {
    marginTop: 9,
    color: colors.ink,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  resultSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
  scoreCircle: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
    borderWidth: 9,
    borderColor: colors.greenPale,
    borderRadius: 74,
    backgroundColor: "#F9FCF9",
  },
  scoreValue: {
    color: colors.greenDark,
    fontSize: 47,
    fontWeight: "800",
    lineHeight: 52,
  },
  scoreTotal: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  resultMessage: {
    maxWidth: 270,
    marginBottom: 22,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  secondaryButton: {
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
});
