import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Weblume'**
  String get appTitle;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navNewScan.
  ///
  /// In en, this message translates to:
  /// **'New scan'**
  String get navNewScan;

  /// No description provided for @navHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get navHistory;

  /// No description provided for @navAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get navAccount;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'You’re offline. Showing saved data.'**
  String get offlineBanner;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t reach Weblume. Check your connection and try again.'**
  String get errorNetwork;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorSessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session has expired. Please log in again.'**
  String get errorSessionExpired;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @invalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get invalidEmail;

  /// No description provided for @enterEmailPassword.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and password.'**
  String get enterEmailPassword;

  /// No description provided for @captchaNotReady.
  ///
  /// In en, this message translates to:
  /// **'Please wait for the security check above to finish, then try again.'**
  String get captchaNotReady;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 10 characters, with upper- and lowercase letters and a number.'**
  String get passwordHint;

  /// No description provided for @passwordNeeds.
  ///
  /// In en, this message translates to:
  /// **'Your password needs {items}.'**
  String passwordNeeds(String items);

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginTitle;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginButton;

  /// No description provided for @googleButton.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get googleButton;

  /// No description provided for @googleOpening.
  ///
  /// In en, this message translates to:
  /// **'Opening Google…'**
  String get googleOpening;

  /// No description provided for @orDivider.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get orDivider;

  /// No description provided for @loggingIn.
  ///
  /// In en, this message translates to:
  /// **'Logging in…'**
  String get loggingIn;

  /// No description provided for @forgotPasswordLink.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get forgotPasswordLink;

  /// No description provided for @noAccountPrompt.
  ///
  /// In en, this message translates to:
  /// **'New to Weblume?'**
  String get noAccountPrompt;

  /// No description provided for @createAccountLink.
  ///
  /// In en, this message translates to:
  /// **'Create a free account'**
  String get createAccountLink;

  /// No description provided for @signupTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your free account'**
  String get signupTitle;

  /// No description provided for @signupButton.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get signupButton;

  /// No description provided for @creatingAccount.
  ///
  /// In en, this message translates to:
  /// **'Creating account…'**
  String get creatingAccount;

  /// No description provided for @termsNotice.
  ///
  /// In en, this message translates to:
  /// **'By creating an account you agree to the Terms of service and Privacy policy.'**
  String get termsNotice;

  /// No description provided for @haveAccountPrompt.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get haveAccountPrompt;

  /// No description provided for @checkEmailTitle.
  ///
  /// In en, this message translates to:
  /// **'Check your email'**
  String get checkEmailTitle;

  /// No description provided for @checkEmailBody.
  ///
  /// In en, this message translates to:
  /// **'If {email} can be used for a new account, we’ve sent a confirmation link to it. Open the link on this device to finish.'**
  String checkEmailBody(String email);

  /// No description provided for @resetTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset your password'**
  String get resetTitle;

  /// No description provided for @resetButton.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get resetButton;

  /// No description provided for @sending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get sending;

  /// No description provided for @resetSent.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for that email, we’ve sent a link to reset the password. Open it on this device.'**
  String get resetSent;

  /// No description provided for @backToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to log in'**
  String get backToLogin;

  /// No description provided for @newPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a new password'**
  String get newPasswordTitle;

  /// No description provided for @newPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPasswordLabel;

  /// No description provided for @confirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get confirmPasswordLabel;

  /// No description provided for @savePassword.
  ///
  /// In en, this message translates to:
  /// **'Save new password'**
  String get savePassword;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get saving;

  /// No description provided for @passwordsDontMatch.
  ///
  /// In en, this message translates to:
  /// **'The passwords don’t match.'**
  String get passwordsDontMatch;

  /// No description provided for @passwordUpdated.
  ///
  /// In en, this message translates to:
  /// **'Your password has been updated.'**
  String get passwordUpdated;

  /// No description provided for @authNotConfiguredTitle.
  ///
  /// In en, this message translates to:
  /// **'Accounts aren’t configured'**
  String get authNotConfiguredTitle;

  /// No description provided for @authNotConfiguredBody.
  ///
  /// In en, this message translates to:
  /// **'This build of the app has no account server configured, so you can’t sign in. You can still run a free scan on the Weblume website.'**
  String get authNotConfiguredBody;

  /// No description provided for @dashboardWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get dashboardWelcome;

  /// No description provided for @dashboardGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String dashboardGreeting(String name);

  /// No description provided for @planName.
  ///
  /// In en, this message translates to:
  /// **'{plan} plan'**
  String planName(String plan);

  /// No description provided for @retentionDays.
  ///
  /// In en, this message translates to:
  /// **'Reports are kept for {days} days.'**
  String retentionDays(int days);

  /// No description provided for @retentionYear.
  ///
  /// In en, this message translates to:
  /// **'Reports are kept for 12 months.'**
  String get retentionYear;

  /// No description provided for @usageTitle.
  ///
  /// In en, this message translates to:
  /// **'Scans this period'**
  String get usageTitle;

  /// No description provided for @usageCount.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit} used'**
  String usageCount(int used, int limit);

  /// No description provided for @usageRemaining.
  ///
  /// In en, this message translates to:
  /// **'{remaining} left · resets {date}'**
  String usageRemaining(int remaining, String date);

  /// No description provided for @usageNoneLeft.
  ///
  /// In en, this message translates to:
  /// **'No scans left · resets {date}'**
  String usageNoneLeft(String date);

  /// No description provided for @usageSemantics.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit} scans used'**
  String usageSemantics(int used, int limit);

  /// No description provided for @recentScans.
  ///
  /// In en, this message translates to:
  /// **'Recent scans'**
  String get recentScans;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get viewAll;

  /// No description provided for @dashboardEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No scans yet'**
  String get dashboardEmptyTitle;

  /// No description provided for @dashboardEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Run your first scan to see a report here.'**
  String get dashboardEmptyBody;

  /// No description provided for @newScanTitle.
  ///
  /// In en, this message translates to:
  /// **'New scan'**
  String get newScanTitle;

  /// No description provided for @urlLabel.
  ///
  /// In en, this message translates to:
  /// **'Website address'**
  String get urlLabel;

  /// No description provided for @urlHint.
  ///
  /// In en, this message translates to:
  /// **'example.com'**
  String get urlHint;

  /// No description provided for @scanButton.
  ///
  /// In en, this message translates to:
  /// **'Scan website'**
  String get scanButton;

  /// No description provided for @starting.
  ///
  /// In en, this message translates to:
  /// **'Starting…'**
  String get starting;

  /// No description provided for @scanDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'We check one public page. Only scan websites you own or are allowed to evaluate.'**
  String get scanDisclaimer;

  /// No description provided for @urlErrorEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter a website address, for example example.com.'**
  String get urlErrorEmpty;

  /// No description provided for @urlErrorTooLong.
  ///
  /// In en, this message translates to:
  /// **'That address is too long (maximum 2048 characters).'**
  String get urlErrorTooLong;

  /// No description provided for @urlErrorInvalid.
  ///
  /// In en, this message translates to:
  /// **'That doesn’t look like a valid web address.'**
  String get urlErrorInvalid;

  /// No description provided for @urlErrorScheme.
  ///
  /// In en, this message translates to:
  /// **'Only http:// and https:// addresses can be scanned.'**
  String get urlErrorScheme;

  /// No description provided for @urlErrorCredentials.
  ///
  /// In en, this message translates to:
  /// **'Addresses containing a username or password can’t be scanned.'**
  String get urlErrorCredentials;

  /// No description provided for @urlErrorPort.
  ///
  /// In en, this message translates to:
  /// **'Only standard web ports (80 and 443) can be scanned.'**
  String get urlErrorPort;

  /// No description provided for @urlErrorHost.
  ///
  /// In en, this message translates to:
  /// **'Enter a public website address with a domain name, like example.com.'**
  String get urlErrorHost;

  /// No description provided for @scanningLabel.
  ///
  /// In en, this message translates to:
  /// **'Scanning'**
  String get scanningLabel;

  /// No description provided for @scanQueued.
  ///
  /// In en, this message translates to:
  /// **'Waiting to start…'**
  String get scanQueued;

  /// No description provided for @scanRunning.
  ///
  /// In en, this message translates to:
  /// **'Scan in progress…'**
  String get scanRunning;

  /// No description provided for @scanStepFetch.
  ///
  /// In en, this message translates to:
  /// **'Fetching the page and reading its HTML'**
  String get scanStepFetch;

  /// No description provided for @scanStepContent.
  ///
  /// In en, this message translates to:
  /// **'Checking titles, headings, links and metadata'**
  String get scanStepContent;

  /// No description provided for @scanStepLinks.
  ///
  /// In en, this message translates to:
  /// **'Checking up to 50 links, robots.txt and the sitemap'**
  String get scanStepLinks;

  /// No description provided for @scanStepSpeed.
  ///
  /// In en, this message translates to:
  /// **'Measuring speed with Google PageSpeed Insights'**
  String get scanStepSpeed;

  /// No description provided for @scanLeaveOpen.
  ///
  /// In en, this message translates to:
  /// **'This usually takes under a minute. The report appears here when it’s ready.'**
  String get scanLeaveOpen;

  /// No description provided for @scanElapsed.
  ///
  /// In en, this message translates to:
  /// **'Elapsed time {time}'**
  String scanElapsed(String time);

  /// No description provided for @scanTakingLong.
  ///
  /// In en, this message translates to:
  /// **'This is taking longer than expected.'**
  String get scanTakingLong;

  /// No description provided for @checkAgain.
  ///
  /// In en, this message translates to:
  /// **'Check again'**
  String get checkAgain;

  /// No description provided for @scanFailedTitle.
  ///
  /// In en, this message translates to:
  /// **'Scan failed'**
  String get scanFailedTitle;

  /// No description provided for @scanFailedNoData.
  ///
  /// In en, this message translates to:
  /// **'No report was produced, and no scores or findings have been estimated.'**
  String get scanFailedNoData;

  /// No description provided for @retryScan.
  ///
  /// In en, this message translates to:
  /// **'Retry scan'**
  String get retryScan;

  /// No description provided for @retrying.
  ///
  /// In en, this message translates to:
  /// **'Retrying…'**
  String get retrying;

  /// No description provided for @reportNotAvailableTitle.
  ///
  /// In en, this message translates to:
  /// **'Report not available'**
  String get reportNotAvailableTitle;

  /// No description provided for @reportNotAvailableBody.
  ///
  /// In en, this message translates to:
  /// **'This report doesn’t exist or has expired.'**
  String get reportNotAvailableBody;

  /// No description provided for @reportTitle.
  ///
  /// In en, this message translates to:
  /// **'Website report'**
  String get reportTitle;

  /// No description provided for @scannedAt.
  ///
  /// In en, this message translates to:
  /// **'Scanned {date}'**
  String scannedAt(String date);

  /// No description provided for @partialNotice.
  ///
  /// In en, this message translates to:
  /// **'Some checks couldn’t be completed. See audit coverage. Everything shown is real data from the checks that did run.'**
  String get partialNotice;

  /// No description provided for @lighthouseTitle.
  ///
  /// In en, this message translates to:
  /// **'Lighthouse scores'**
  String get lighthouseTitle;

  /// No description provided for @lighthouseSource.
  ///
  /// In en, this message translates to:
  /// **'Measured by Google PageSpeed Insights'**
  String get lighthouseSource;

  /// No description provided for @lighthouseUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Lighthouse scores aren’t available for this scan, so none are shown. See audit coverage for the reason.'**
  String get lighthouseUnavailable;

  /// No description provided for @strategyMobile.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get strategyMobile;

  /// No description provided for @strategyDesktop.
  ///
  /// In en, this message translates to:
  /// **'Desktop'**
  String get strategyDesktop;

  /// No description provided for @scorePerformance.
  ///
  /// In en, this message translates to:
  /// **'Performance'**
  String get scorePerformance;

  /// No description provided for @scoreAccessibility.
  ///
  /// In en, this message translates to:
  /// **'Accessibility'**
  String get scoreAccessibility;

  /// No description provided for @scoreSeo.
  ///
  /// In en, this message translates to:
  /// **'SEO'**
  String get scoreSeo;

  /// No description provided for @scoreBestPractices.
  ///
  /// In en, this message translates to:
  /// **'Best practices'**
  String get scoreBestPractices;

  /// No description provided for @scoreNotMeasured.
  ///
  /// In en, this message translates to:
  /// **'not measured'**
  String get scoreNotMeasured;

  /// No description provided for @scoreGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get scoreGood;

  /// No description provided for @scoreNeedsWork.
  ///
  /// In en, this message translates to:
  /// **'Needs work'**
  String get scoreNeedsWork;

  /// No description provided for @scorePoor.
  ///
  /// In en, this message translates to:
  /// **'Poor'**
  String get scorePoor;

  /// No description provided for @scoreSemantics.
  ///
  /// In en, this message translates to:
  /// **'{label}: {score} out of 100, {band}'**
  String scoreSemantics(String label, int score, String band);

  /// No description provided for @findingsSummary.
  ///
  /// In en, this message translates to:
  /// **'Findings summary'**
  String get findingsSummary;

  /// No description provided for @passedChecks.
  ///
  /// In en, this message translates to:
  /// **'{count} of Weblume’s own checks passed.'**
  String passedChecks(int count);

  /// No description provided for @topPriorities.
  ///
  /// In en, this message translates to:
  /// **'Start here: top priorities'**
  String get topPriorities;

  /// No description provided for @allFindings.
  ///
  /// In en, this message translates to:
  /// **'All findings'**
  String get allFindings;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All ({count})'**
  String filterAll(int count);

  /// No description provided for @filterCategory.
  ///
  /// In en, this message translates to:
  /// **'{category} ({count})'**
  String filterCategory(String category, int count);

  /// No description provided for @categoryPerformance.
  ///
  /// In en, this message translates to:
  /// **'Performance'**
  String get categoryPerformance;

  /// No description provided for @categorySeo.
  ///
  /// In en, this message translates to:
  /// **'SEO'**
  String get categorySeo;

  /// No description provided for @categoryAccessibility.
  ///
  /// In en, this message translates to:
  /// **'Accessibility'**
  String get categoryAccessibility;

  /// No description provided for @categoryTechnical.
  ///
  /// In en, this message translates to:
  /// **'Technical health'**
  String get categoryTechnical;

  /// No description provided for @noFindingsInCategory.
  ///
  /// In en, this message translates to:
  /// **'No findings in this category.'**
  String get noFindingsInCategory;

  /// No description provided for @coverageTitle.
  ///
  /// In en, this message translates to:
  /// **'Audit coverage'**
  String get coverageTitle;

  /// No description provided for @limitationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Limitations'**
  String get limitationsTitle;

  /// No description provided for @limitationsBody.
  ///
  /// In en, this message translates to:
  /// **'This is an automated audit of a single page. “Measured” results are Lighthouse lab measurements, which vary between runs. “Detected” findings come from automated checks, which find only some accessibility barriers, can’t guarantee search rankings, and don’t test security.'**
  String get limitationsBody;

  /// No description provided for @sourcePageFetch.
  ///
  /// In en, this message translates to:
  /// **'Page fetch & HTML checks'**
  String get sourcePageFetch;

  /// No description provided for @sourcePsiMobile.
  ///
  /// In en, this message translates to:
  /// **'Lighthouse via PageSpeed Insights (mobile)'**
  String get sourcePsiMobile;

  /// No description provided for @sourcePsiDesktop.
  ///
  /// In en, this message translates to:
  /// **'Lighthouse via PageSpeed Insights (desktop)'**
  String get sourcePsiDesktop;

  /// No description provided for @sourceLinkCheck.
  ///
  /// In en, this message translates to:
  /// **'Link check (up to 50 links)'**
  String get sourceLinkCheck;

  /// No description provided for @sourceRobotsSitemap.
  ///
  /// In en, this message translates to:
  /// **'robots.txt & sitemap'**
  String get sourceRobotsSitemap;

  /// No description provided for @sourceOk.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get sourceOk;

  /// No description provided for @sourceNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Not available (not configured on this server)'**
  String get sourceNotConfigured;

  /// No description provided for @sourceDisabled.
  ///
  /// In en, this message translates to:
  /// **'Turned off'**
  String get sourceDisabled;

  /// No description provided for @sourceTimeout.
  ///
  /// In en, this message translates to:
  /// **'Didn’t finish in time'**
  String get sourceTimeout;

  /// No description provided for @sourceQuota.
  ///
  /// In en, this message translates to:
  /// **'Daily quota reached. Try again later'**
  String get sourceQuota;

  /// No description provided for @sourceUpstream.
  ///
  /// In en, this message translates to:
  /// **'The service returned an error'**
  String get sourceUpstream;

  /// No description provided for @sourceUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Unavailable'**
  String get sourceUnavailable;

  /// No description provided for @whatItMeans.
  ///
  /// In en, this message translates to:
  /// **'What this means'**
  String get whatItMeans;

  /// No description provided for @whyItMatters.
  ///
  /// In en, this message translates to:
  /// **'Why it matters'**
  String get whyItMatters;

  /// No description provided for @howToFix.
  ///
  /// In en, this message translates to:
  /// **'How to fix it'**
  String get howToFix;

  /// No description provided for @whatWeFound.
  ///
  /// In en, this message translates to:
  /// **'What we found'**
  String get whatWeFound;

  /// No description provided for @learnMore.
  ///
  /// In en, this message translates to:
  /// **'Learn more'**
  String get learnMore;

  /// No description provided for @kindMeasured.
  ///
  /// In en, this message translates to:
  /// **'Measured'**
  String get kindMeasured;

  /// No description provided for @kindDetected.
  ///
  /// In en, this message translates to:
  /// **'Detected automatically'**
  String get kindDetected;

  /// No description provided for @kindRecommendation.
  ///
  /// In en, this message translates to:
  /// **'Recommendation'**
  String get kindRecommendation;

  /// No description provided for @historyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your scans'**
  String get historyTitle;

  /// No description provided for @historySearch.
  ///
  /// In en, this message translates to:
  /// **'Search by address'**
  String get historySearch;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @loadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get loadMore;

  /// No description provided for @noMatches.
  ///
  /// In en, this message translates to:
  /// **'No scans match that search'**
  String get noMatches;

  /// No description provided for @historyEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No saved scans yet'**
  String get historyEmptyTitle;

  /// No description provided for @historyEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Scans you run will be listed here so you can revisit them.'**
  String get historyEmptyBody;

  /// No description provided for @statusQueued.
  ///
  /// In en, this message translates to:
  /// **'Queued'**
  String get statusQueued;

  /// No description provided for @statusRunning.
  ///
  /// In en, this message translates to:
  /// **'Running'**
  String get statusRunning;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusPartial.
  ///
  /// In en, this message translates to:
  /// **'Partial'**
  String get statusPartial;

  /// No description provided for @statusFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get statusFailed;

  /// No description provided for @accountTitle.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get accountTitle;

  /// No description provided for @profileSection.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileSection;

  /// No description provided for @signedInAs.
  ///
  /// In en, this message translates to:
  /// **'Signed in as {email}'**
  String signedInAs(String email);

  /// No description provided for @displayNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get displayNameLabel;

  /// No description provided for @saveName.
  ///
  /// In en, this message translates to:
  /// **'Save name'**
  String get saveName;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get saved;

  /// No description provided for @planSection.
  ///
  /// In en, this message translates to:
  /// **'Plan and usage'**
  String get planSection;

  /// No description provided for @planDetails.
  ///
  /// In en, this message translates to:
  /// **'{scans} scans per period'**
  String planDetails(int scans);

  /// No description provided for @paidComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Paid plans with more scans, PDF reports and share links are coming soon.'**
  String get paidComingSoon;

  /// No description provided for @dataSection.
  ///
  /// In en, this message translates to:
  /// **'Your data'**
  String get dataSection;

  /// No description provided for @logOut.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logOut;

  /// No description provided for @legalSection.
  ///
  /// In en, this message translates to:
  /// **'Legal'**
  String get legalSection;

  /// No description provided for @accountPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get accountPrivacy;

  /// No description provided for @accountTerms.
  ///
  /// In en, this message translates to:
  /// **'Terms of service'**
  String get accountTerms;

  /// No description provided for @deleteSection.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteSection;

  /// No description provided for @deleteWarning.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes your account, your saved reports and your settings. It can’t be undone. If you subscribed through Google Play, cancel the subscription in Google Play first, because deleting your account doesn’t cancel it.'**
  String get deleteWarning;

  /// No description provided for @deleteConfirmLabel.
  ///
  /// In en, this message translates to:
  /// **'Type \"DELETE\" to confirm'**
  String get deleteConfirmLabel;

  /// No description provided for @deleteButton.
  ///
  /// In en, this message translates to:
  /// **'Permanently delete my account'**
  String get deleteButton;

  /// No description provided for @deleting.
  ///
  /// In en, this message translates to:
  /// **'Deleting…'**
  String get deleting;

  /// No description provided for @deleteTypeError.
  ///
  /// In en, this message translates to:
  /// **'Type DELETE (in capitals) to confirm.'**
  String get deleteTypeError;

  /// No description provided for @accountDeleted.
  ///
  /// In en, this message translates to:
  /// **'Your account and its data have been deleted.'**
  String get accountDeleted;

  /// No description provided for @accountDeletionPending.
  ///
  /// In en, this message translates to:
  /// **'Your account data has been deleted. Your sign-in record will be removed shortly.'**
  String get accountDeletionPending;

  /// No description provided for @accountVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String accountVersion(String version);

  /// No description provided for @criticalHighCount.
  ///
  /// In en, this message translates to:
  /// **'{count} critical/high'**
  String criticalHighCount(int count);

  /// No description provided for @subscriptionTitle.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to Starter'**
  String get subscriptionTitle;

  /// No description provided for @subscriptionUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Paid plans aren’t available in the app yet.'**
  String get subscriptionUnavailable;

  /// No description provided for @storeUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Google Play Billing isn’t available on this device right now. Check that Google Play is installed and you’re signed in, then try again.'**
  String get storeUnavailable;

  /// No description provided for @planFeatureScans.
  ///
  /// In en, this message translates to:
  /// **'{scans} scans per billing period'**
  String planFeatureScans(int scans);

  /// No description provided for @planFeatureMonitoring.
  ///
  /// In en, this message translates to:
  /// **'Monitor {sites} sites daily, with email alerts'**
  String planFeatureMonitoring(int sites);

  /// No description provided for @planFeatureRetention.
  ///
  /// In en, this message translates to:
  /// **'Reports kept for 12 months'**
  String get planFeatureRetention;

  /// No description provided for @planFeatureCompare.
  ///
  /// In en, this message translates to:
  /// **'Compare scans over time'**
  String get planFeatureCompare;

  /// No description provided for @planFeaturePdf.
  ///
  /// In en, this message translates to:
  /// **'PDF reports and private share links'**
  String get planFeaturePdf;

  /// No description provided for @offerMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get offerMonthly;

  /// No description provided for @offerAnnual.
  ///
  /// In en, this message translates to:
  /// **'Yearly'**
  String get offerAnnual;

  /// No description provided for @perMonth.
  ///
  /// In en, this message translates to:
  /// **'{price} / month'**
  String perMonth(String price);

  /// No description provided for @perYear.
  ///
  /// In en, this message translates to:
  /// **'{price} / year'**
  String perYear(String price);

  /// No description provided for @subscribe.
  ///
  /// In en, this message translates to:
  /// **'Subscribe'**
  String get subscribe;

  /// No description provided for @restorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Restore purchases'**
  String get restorePurchases;

  /// No description provided for @playBillingNote.
  ///
  /// In en, this message translates to:
  /// **'Payment is charged to your Google Play account. Your subscription renews automatically until you cancel it in Google Play.'**
  String get playBillingNote;

  /// No description provided for @purchasePending.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your payment to complete…'**
  String get purchasePending;

  /// No description provided for @purchaseVerifying.
  ///
  /// In en, this message translates to:
  /// **'Confirming your purchase…'**
  String get purchaseVerifying;

  /// No description provided for @purchaseSuccess.
  ///
  /// In en, this message translates to:
  /// **'You’re on Starter. Thank you!'**
  String get purchaseSuccess;

  /// No description provided for @purchaseDuplicate.
  ///
  /// In en, this message translates to:
  /// **'You now have more than one active subscription (web and Google Play). Cancel the one you don’t need to avoid paying twice.'**
  String get purchaseDuplicate;

  /// No description provided for @purchaseFailed.
  ///
  /// In en, this message translates to:
  /// **'The purchase didn’t go through. You haven’t been charged.'**
  String get purchaseFailed;

  /// No description provided for @purchaseAccountMismatch.
  ///
  /// In en, this message translates to:
  /// **'This Google Play purchase belongs to a different Weblume account.'**
  String get purchaseAccountMismatch;

  /// No description provided for @purchaseVerifyFailed.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t confirm your purchase yet. It will be checked again automatically, and you won’t be charged twice.'**
  String get purchaseVerifyFailed;

  /// No description provided for @subscribedOnWeb.
  ///
  /// In en, this message translates to:
  /// **'You’re subscribed through the Weblume website. You can update your payment details or cancel with our payment partner.'**
  String get subscribedOnWeb;

  /// No description provided for @subscribedOnPlay.
  ///
  /// In en, this message translates to:
  /// **'You’re subscribed through Google Play.'**
  String get subscribedOnPlay;

  /// No description provided for @manageOnWeb.
  ///
  /// In en, this message translates to:
  /// **'Manage subscription'**
  String get manageOnWeb;

  /// No description provided for @manageInPlay.
  ///
  /// In en, this message translates to:
  /// **'Manage in Google Play'**
  String get manageInPlay;

  /// No description provided for @upgradeButton.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to Starter'**
  String get upgradeButton;

  /// No description provided for @subscriptionStatusLine.
  ///
  /// In en, this message translates to:
  /// **'{channel} · {status}'**
  String subscriptionStatusLine(String channel, String status);

  /// No description provided for @channelWeb.
  ///
  /// In en, this message translates to:
  /// **'Web'**
  String get channelWeb;

  /// No description provided for @channelPlay.
  ///
  /// In en, this message translates to:
  /// **'Google Play'**
  String get channelPlay;

  /// No description provided for @subStatusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get subStatusActive;

  /// No description provided for @subStatusTrial.
  ///
  /// In en, this message translates to:
  /// **'Trial'**
  String get subStatusTrial;

  /// No description provided for @subStatusGrace.
  ///
  /// In en, this message translates to:
  /// **'Payment issue (still active)'**
  String get subStatusGrace;

  /// No description provided for @subStatusOnHold.
  ///
  /// In en, this message translates to:
  /// **'On hold: payment failed'**
  String get subStatusOnHold;

  /// No description provided for @subStatusPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get subStatusPaused;

  /// No description provided for @subStatusCanceled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled (active until the period ends)'**
  String get subStatusCanceled;

  /// No description provided for @subStatusEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get subStatusEnded;

  /// No description provided for @subStatusRefunded.
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get subStatusRefunded;

  /// No description provided for @manageSubscription.
  ///
  /// In en, this message translates to:
  /// **'Manage subscription'**
  String get manageSubscription;

  /// No description provided for @reportActionShare.
  ///
  /// In en, this message translates to:
  /// **'Share link'**
  String get reportActionShare;

  /// No description provided for @reportActionCompare.
  ///
  /// In en, this message translates to:
  /// **'Compare'**
  String get reportActionCompare;

  /// No description provided for @reportUpsell.
  ///
  /// In en, this message translates to:
  /// **'Share links, PDF reports and before/after comparisons are part of Starter.'**
  String get reportUpsell;

  /// No description provided for @reportActionDownloadPdf.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get reportActionDownloadPdf;

  /// No description provided for @reportActionSharePdf.
  ///
  /// In en, this message translates to:
  /// **'Share PDF'**
  String get reportActionSharePdf;

  /// No description provided for @pdfSaved.
  ///
  /// In en, this message translates to:
  /// **'PDF saved.'**
  String get pdfSaved;

  /// No description provided for @pdfFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t save the PDF on this device. Try Share PDF instead.'**
  String get pdfFailed;

  /// No description provided for @shareTitle.
  ///
  /// In en, this message translates to:
  /// **'Share a read-only copy'**
  String get shareTitle;

  /// No description provided for @shareBody.
  ///
  /// In en, this message translates to:
  /// **'Anyone with the link can view this report without an account. Your email and other reports stay private.'**
  String get shareBody;

  /// No description provided for @shareExpiryLabel.
  ///
  /// In en, this message translates to:
  /// **'Link works for'**
  String get shareExpiryLabel;

  /// No description provided for @shareDays.
  ///
  /// In en, this message translates to:
  /// **'{days} days'**
  String shareDays(int days);

  /// No description provided for @shareOneYear.
  ///
  /// In en, this message translates to:
  /// **'1 year'**
  String get shareOneYear;

  /// No description provided for @shareCreate.
  ///
  /// In en, this message translates to:
  /// **'Create link'**
  String get shareCreate;

  /// No description provided for @shareCreating.
  ///
  /// In en, this message translates to:
  /// **'Creating…'**
  String get shareCreating;

  /// No description provided for @shareCreated.
  ///
  /// In en, this message translates to:
  /// **'Link created and copied. For security it’s shown only once, so paste it somewhere now.'**
  String get shareCreated;

  /// No description provided for @shareCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get shareCopy;

  /// No description provided for @shareCopied.
  ///
  /// In en, this message translates to:
  /// **'Copied'**
  String get shareCopied;

  /// No description provided for @shareActive.
  ///
  /// In en, this message translates to:
  /// **'Active links'**
  String get shareActive;

  /// No description provided for @shareNone.
  ///
  /// In en, this message translates to:
  /// **'No active links.'**
  String get shareNone;

  /// No description provided for @shareTurnOff.
  ///
  /// In en, this message translates to:
  /// **'Turn off'**
  String get shareTurnOff;

  /// No description provided for @shareTurnOffSemantics.
  ///
  /// In en, this message translates to:
  /// **'Turn off link created {date}'**
  String shareTurnOffSemantics(String date);

  /// No description provided for @shareCreatedOn.
  ///
  /// In en, this message translates to:
  /// **'Created {date}'**
  String shareCreatedOn(String date);

  /// No description provided for @shareExpiresOn.
  ///
  /// In en, this message translates to:
  /// **'expires {date}'**
  String shareExpiresOn(String date);

  /// No description provided for @shareRetentionNote.
  ///
  /// In en, this message translates to:
  /// **'A link also stops working when this report reaches the end of its retention period.'**
  String get shareRetentionNote;

  /// No description provided for @compareTitle.
  ///
  /// In en, this message translates to:
  /// **'Compare scans'**
  String get compareTitle;

  /// No description provided for @comparePick.
  ///
  /// In en, this message translates to:
  /// **'Choose another scan of this address to compare with the one from {date}.'**
  String comparePick(String date);

  /// No description provided for @compareNoOther.
  ///
  /// In en, this message translates to:
  /// **'There’s no other finished scan of this address yet. Run a new scan after making changes, then compare the two.'**
  String get compareNoOther;

  /// No description provided for @compareFindingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} findings'**
  String compareFindingCount(int count);

  /// No description provided for @compareRange.
  ///
  /// In en, this message translates to:
  /// **'{from} → {to}'**
  String compareRange(String from, String to);

  /// No description provided for @compareResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get compareResolved;

  /// No description provided for @compareNew.
  ///
  /// In en, this message translates to:
  /// **'New issues'**
  String get compareNew;

  /// No description provided for @compareStillOpen.
  ///
  /// In en, this message translates to:
  /// **'Still open'**
  String get compareStillOpen;

  /// No description provided for @compareNotComparable.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t compare'**
  String get compareNotComparable;

  /// No description provided for @compareNotComparableBody.
  ///
  /// In en, this message translates to:
  /// **'These come from a check that didn’t run in one of the two scans, so we can’t say whether they’re new or fixed.'**
  String get compareNotComparableBody;

  /// No description provided for @compareGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'{title} ({count})'**
  String compareGroupTitle(String title, int count);

  /// No description provided for @compareNone.
  ///
  /// In en, this message translates to:
  /// **'None.'**
  String get compareNone;

  /// No description provided for @compareScores.
  ///
  /// In en, this message translates to:
  /// **'Lighthouse scores'**
  String get compareScores;

  /// No description provided for @compareNoScores.
  ///
  /// In en, this message translates to:
  /// **'Neither scan has Lighthouse scores, so no score changes are shown.'**
  String get compareNoScores;

  /// No description provided for @compareScoresVary.
  ///
  /// In en, this message translates to:
  /// **'Lab scores vary by a few points between runs even when nothing changed.'**
  String get compareScoresVary;

  /// No description provided for @compareScoreChange.
  ///
  /// In en, this message translates to:
  /// **'{before} → {after} ({change})'**
  String compareScoreChange(String before, String after, String change);

  /// No description provided for @compareWasSeverity.
  ///
  /// In en, this message translates to:
  /// **'Was {severity}'**
  String compareWasSeverity(String severity);

  /// No description provided for @seePlans.
  ///
  /// In en, this message translates to:
  /// **'See plans'**
  String get seePlans;

  /// No description provided for @newScanHeadline.
  ///
  /// In en, this message translates to:
  /// **'Audit any website'**
  String get newScanHeadline;

  /// No description provided for @newScanSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Performance, SEO, accessibility and technical health, explained in plain language.'**
  String get newScanSubtitle;

  /// No description provided for @whatWeCheck.
  ///
  /// In en, this message translates to:
  /// **'What we check'**
  String get whatWeCheck;

  /// No description provided for @starterTagline.
  ///
  /// In en, this message translates to:
  /// **'For freelancers and agencies who send reports to clients.'**
  String get starterTagline;

  /// No description provided for @choosePlan.
  ///
  /// In en, this message translates to:
  /// **'Choose how to pay'**
  String get choosePlan;

  /// No description provided for @monitoringTitle.
  ///
  /// In en, this message translates to:
  /// **'Monitoring'**
  String get monitoringTitle;

  /// No description provided for @monitoringSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We re-scan these sites automatically and email you when something changes.'**
  String get monitoringSubtitle;

  /// No description provided for @monitoringEmpty.
  ///
  /// In en, this message translates to:
  /// **'Get an email when new issues appear on your site or its scores change. Scheduled scans don’t use your monthly scans.'**
  String get monitoringEmpty;

  /// No description provided for @monitoringPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get monitoringPaused;

  /// No description provided for @monitoringNext.
  ///
  /// In en, this message translates to:
  /// **'{frequency} · next scan {date}'**
  String monitoringNext(String frequency, String date);

  /// No description provided for @monitoringCount.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit} monitored'**
  String monitoringCount(int used, int limit);

  /// No description provided for @frequencyDaily.
  ///
  /// In en, this message translates to:
  /// **'Every day'**
  String get frequencyDaily;

  /// No description provided for @frequencyWeekly.
  ///
  /// In en, this message translates to:
  /// **'Every week'**
  String get frequencyWeekly;

  /// No description provided for @frequencyMonthly.
  ///
  /// In en, this message translates to:
  /// **'Every month'**
  String get frequencyMonthly;

  /// No description provided for @monitoringSkipPlan.
  ///
  /// In en, this message translates to:
  /// **'Paused: your plan doesn’t include monitoring.'**
  String get monitoringSkipPlan;

  /// No description provided for @monitoringSkipLimit.
  ///
  /// In en, this message translates to:
  /// **'Paused: your plan includes fewer monitored sites.'**
  String get monitoringSkipLimit;

  /// No description provided for @monitoringSkipBusy.
  ///
  /// In en, this message translates to:
  /// **'The last run was skipped because the one before was still going.'**
  String get monitoringSkipBusy;

  /// No description provided for @monitoringAddButton.
  ///
  /// In en, this message translates to:
  /// **'Monitor a site'**
  String get monitoringAddButton;

  /// No description provided for @monitoringAddBody.
  ///
  /// In en, this message translates to:
  /// **'We’ll re-scan it automatically and email you a short summary when something changes. Scheduled scans don’t use your monthly scans.'**
  String get monitoringAddBody;

  /// No description provided for @monitoringFrequencyLabel.
  ///
  /// In en, this message translates to:
  /// **'How often'**
  String get monitoringFrequencyLabel;

  /// No description provided for @monitoringAlertLabel.
  ///
  /// In en, this message translates to:
  /// **'Email me when'**
  String get monitoringAlertLabel;

  /// No description provided for @alertAnyChange.
  ///
  /// In en, this message translates to:
  /// **'Anything changes'**
  String get alertAnyChange;

  /// No description provided for @alertNewFindings.
  ///
  /// In en, this message translates to:
  /// **'New issues appear'**
  String get alertNewFindings;

  /// No description provided for @alertScoreDrop.
  ///
  /// In en, this message translates to:
  /// **'A score drops'**
  String get alertScoreDrop;

  /// No description provided for @alertNone.
  ///
  /// In en, this message translates to:
  /// **'Never (just scan)'**
  String get alertNone;

  /// No description provided for @monitoringStart.
  ///
  /// In en, this message translates to:
  /// **'Start monitoring'**
  String get monitoringStart;

  /// No description provided for @monitoringStarting.
  ///
  /// In en, this message translates to:
  /// **'Starting…'**
  String get monitoringStarting;

  /// No description provided for @monitoringStarted.
  ///
  /// In en, this message translates to:
  /// **'Monitoring started. We’ll email you when something changes.'**
  String get monitoringStarted;

  /// No description provided for @monitoringSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Monitoring settings'**
  String get monitoringSettingsTitle;

  /// No description provided for @monitoringPause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get monitoringPause;

  /// No description provided for @monitoringResume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get monitoringResume;

  /// No description provided for @monitoringPausedNote.
  ///
  /// In en, this message translates to:
  /// **'No scans or emails while paused.'**
  String get monitoringPausedNote;

  /// No description provided for @monitoringOpenLatest.
  ///
  /// In en, this message translates to:
  /// **'Open the latest report'**
  String get monitoringOpenLatest;

  /// No description provided for @monitoringStop.
  ///
  /// In en, this message translates to:
  /// **'Stop monitoring'**
  String get monitoringStop;

  /// No description provided for @monitoringStopConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Stop monitoring this site?'**
  String get monitoringStopConfirmTitle;

  /// No description provided for @monitoringStopConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Scheduled scans and emails for {url} will end. Its past reports are kept.'**
  String monitoringStopConfirmBody(String url);

  /// No description provided for @monitoringFull.
  ///
  /// In en, this message translates to:
  /// **'{limit, plural, =1{Your plan’s monitored site is in use. Stop it to add a different one.} other{All {limit} monitored sites are in use. Stop one to add another.}}'**
  String monitoringFull(int limit);

  /// No description provided for @monitoringThisSite.
  ///
  /// In en, this message translates to:
  /// **'Monitor this site'**
  String get monitoringThisSite;

  /// No description provided for @monitoringActive.
  ///
  /// In en, this message translates to:
  /// **'Monitored · {frequency}'**
  String monitoringActive(String frequency);

  /// No description provided for @monitoringSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get monitoringSaved;

  /// No description provided for @exportBody.
  ///
  /// In en, this message translates to:
  /// **'Download a copy of everything Weblume holds about your account (your profile, plan, saved reports and monitored sites) as a JSON file.'**
  String get exportBody;

  /// No description provided for @exportDownload.
  ///
  /// In en, this message translates to:
  /// **'Download my data'**
  String get exportDownload;

  /// No description provided for @exportShare.
  ///
  /// In en, this message translates to:
  /// **'Share my data'**
  String get exportShare;

  /// No description provided for @exportSaved.
  ///
  /// In en, this message translates to:
  /// **'Your data was saved.'**
  String get exportSaved;

  /// No description provided for @exportFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t save the file on this device. Try Share my data instead.'**
  String get exportFailed;

  /// No description provided for @portalOpening.
  ///
  /// In en, this message translates to:
  /// **'Opening…'**
  String get portalOpening;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
