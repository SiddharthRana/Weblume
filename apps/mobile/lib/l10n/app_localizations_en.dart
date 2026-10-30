// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Weblume';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navNewScan => 'New scan';

  @override
  String get navHistory => 'History';

  @override
  String get navAccount => 'Account';

  @override
  String get loading => 'Loading…';

  @override
  String get tryAgain => 'Try again';

  @override
  String get offlineBanner => 'You’re offline — showing saved data.';

  @override
  String get errorNetwork => 'We couldn’t reach Weblume. Check your connection and try again.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorSessionExpired => 'Your session has expired. Please log in again.';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get invalidEmail => 'Enter a valid email address.';

  @override
  String get enterEmailPassword => 'Enter your email and password.';

  @override
  String get passwordHint => 'At least 10 characters, with upper- and lowercase letters and a number.';

  @override
  String passwordNeeds(String items) {
    return 'Your password needs $items.';
  }

  @override
  String get loginTitle => 'Log in';

  @override
  String get loginButton => 'Log in';

  @override
  String get loggingIn => 'Logging in…';

  @override
  String get forgotPasswordLink => 'Forgot your password?';

  @override
  String get noAccountPrompt => 'New to Weblume?';

  @override
  String get createAccountLink => 'Create a free account';

  @override
  String get signupTitle => 'Create your free account';

  @override
  String get signupButton => 'Create account';

  @override
  String get creatingAccount => 'Creating account…';

  @override
  String get termsNotice => 'By creating an account you agree to the Terms of service and Privacy policy.';

  @override
  String get haveAccountPrompt => 'Already have an account?';

  @override
  String get checkEmailTitle => 'Check your email';

  @override
  String checkEmailBody(String email) {
    return 'If $email can be used for a new account, we’ve sent a confirmation link to it. Open the link on this device to finish.';
  }

  @override
  String get resetTitle => 'Reset your password';

  @override
  String get resetButton => 'Send reset link';

  @override
  String get sending => 'Sending…';

  @override
  String get resetSent =>
      'If an account exists for that email, we’ve sent a link to reset the password. Open it on this device.';

  @override
  String get backToLogin => 'Back to log in';

  @override
  String get newPasswordTitle => 'Choose a new password';

  @override
  String get newPasswordLabel => 'New password';

  @override
  String get confirmPasswordLabel => 'Confirm new password';

  @override
  String get savePassword => 'Save new password';

  @override
  String get saving => 'Saving…';

  @override
  String get passwordsDontMatch => 'The passwords don’t match.';

  @override
  String get passwordUpdated => 'Your password has been updated.';

  @override
  String get authNotConfiguredTitle => 'Accounts aren’t configured';

  @override
  String get authNotConfiguredBody =>
      'This build of the app has no account server configured, so you can’t sign in. You can still run a free scan on the Weblume website.';

  @override
  String get dashboardWelcome => 'Welcome back';

  @override
  String dashboardGreeting(String name) {
    return 'Hi, $name';
  }

  @override
  String planName(String plan) {
    return '$plan plan';
  }

  @override
  String retentionDays(int days) {
    return 'Reports are kept for $days days.';
  }

  @override
  String get retentionYear => 'Reports are kept for 12 months.';

  @override
  String get usageTitle => 'Scans this period';

  @override
  String usageCount(int used, int limit) {
    return '$used of $limit used';
  }

  @override
  String usageRemaining(int remaining, String date) {
    return '$remaining left · resets $date';
  }

  @override
  String usageNoneLeft(String date) {
    return 'No scans left · resets $date';
  }

  @override
  String usageSemantics(int used, int limit) {
    return '$used of $limit scans used';
  }

  @override
  String get recentScans => 'Recent scans';

  @override
  String get viewAll => 'View all';

  @override
  String get dashboardEmptyTitle => 'No scans yet';

  @override
  String get dashboardEmptyBody => 'Run your first scan to see a report here.';

  @override
  String get newScanTitle => 'New scan';

  @override
  String get urlLabel => 'Website address';

  @override
  String get urlHint => 'example.com';

  @override
  String get scanButton => 'Scan website';

  @override
  String get starting => 'Starting…';

  @override
  String get scanDisclaimer => 'We check one public page. Only scan websites you own or are allowed to evaluate.';

  @override
  String get urlErrorEmpty => 'Enter a website address, for example example.com.';

  @override
  String get urlErrorTooLong => 'That address is too long (maximum 2048 characters).';

  @override
  String get urlErrorInvalid => 'That doesn’t look like a valid web address.';

  @override
  String get urlErrorScheme => 'Only http:// and https:// addresses can be scanned.';

  @override
  String get urlErrorCredentials => 'Addresses containing a username or password can’t be scanned.';

  @override
  String get urlErrorPort => 'Only standard web ports (80 and 443) can be scanned.';

  @override
  String get urlErrorHost => 'Enter a public website address with a domain name, like example.com.';

  @override
  String get scanningLabel => 'Scanning';

  @override
  String get scanQueued => 'Waiting to start…';

  @override
  String get scanRunning => 'Scan in progress…';

  @override
  String get scanProgressBody =>
      'This usually takes under a minute. We’re checking the page, up to 50 links, robots.txt and the sitemap, and measuring performance with Google PageSpeed Insights.';

  @override
  String get scanTakingLong => 'This is taking longer than expected.';

  @override
  String get checkAgain => 'Check again';

  @override
  String get scanFailedTitle => 'Scan failed';

  @override
  String get scanFailedNoData => 'No report was produced, and no scores or findings have been estimated.';

  @override
  String get retryScan => 'Retry scan';

  @override
  String get retrying => 'Retrying…';

  @override
  String get reportNotAvailableTitle => 'Report not available';

  @override
  String get reportNotAvailableBody => 'This report doesn’t exist or has expired.';

  @override
  String get reportTitle => 'Website report';

  @override
  String scannedAt(String date) {
    return 'Scanned $date';
  }

  @override
  String get partialNotice =>
      'Some checks couldn’t be completed — see audit coverage. Everything shown is real data from the checks that did run.';

  @override
  String get lighthouseTitle => 'Lighthouse scores';

  @override
  String get lighthouseSource => 'Measured by Google PageSpeed Insights';

  @override
  String get lighthouseUnavailable =>
      'Lighthouse scores aren’t available for this scan, so none are shown. See audit coverage for the reason.';

  @override
  String get strategyMobile => 'Mobile';

  @override
  String get strategyDesktop => 'Desktop';

  @override
  String get scorePerformance => 'Performance';

  @override
  String get scoreAccessibility => 'Accessibility';

  @override
  String get scoreSeo => 'SEO';

  @override
  String get scoreBestPractices => 'Best practices';

  @override
  String get scoreNotMeasured => 'not measured';

  @override
  String get scoreGood => 'Good';

  @override
  String get scoreNeedsWork => 'Needs work';

  @override
  String get scorePoor => 'Poor';

  @override
  String scoreSemantics(String label, int score, String band) {
    return '$label: $score out of 100, $band';
  }

  @override
  String get findingsSummary => 'Findings summary';

  @override
  String passedChecks(int count) {
    return '$count of Weblume’s own checks passed.';
  }

  @override
  String get topPriorities => 'Start here: top priorities';

  @override
  String get allFindings => 'All findings';

  @override
  String filterAll(int count) {
    return 'All ($count)';
  }

  @override
  String filterCategory(String category, int count) {
    return '$category ($count)';
  }

  @override
  String get categoryPerformance => 'Performance';

  @override
  String get categorySeo => 'SEO';

  @override
  String get categoryAccessibility => 'Accessibility';

  @override
  String get categoryTechnical => 'Technical health';

  @override
  String get noFindingsInCategory => 'No findings in this category.';

  @override
  String get coverageTitle => 'Audit coverage';

  @override
  String get limitationsTitle => 'Limitations';

  @override
  String get limitationsBody =>
      'This is an automated audit of a single page. “Measured” results are Lighthouse lab measurements, which vary between runs. “Detected” findings come from automated checks, which find only some accessibility barriers, can’t guarantee search rankings, and don’t test security.';

  @override
  String get sourcePageFetch => 'Page fetch & HTML checks';

  @override
  String get sourcePsiMobile => 'Lighthouse via PageSpeed Insights (mobile)';

  @override
  String get sourcePsiDesktop => 'Lighthouse via PageSpeed Insights (desktop)';

  @override
  String get sourceLinkCheck => 'Link check (up to 50 links)';

  @override
  String get sourceRobotsSitemap => 'robots.txt & sitemap';

  @override
  String get sourceOk => 'Completed';

  @override
  String get sourceNotConfigured => 'Not available — not configured on this server';

  @override
  String get sourceDisabled => 'Turned off';

  @override
  String get sourceTimeout => 'Didn’t finish in time';

  @override
  String get sourceQuota => 'Daily quota reached — try again later';

  @override
  String get sourceUpstream => 'The service returned an error';

  @override
  String get sourceUnavailable => 'Unavailable';

  @override
  String get whatItMeans => 'What this means';

  @override
  String get whyItMatters => 'Why it matters';

  @override
  String get howToFix => 'How to fix it';

  @override
  String get whatWeFound => 'What we found';

  @override
  String get learnMore => 'Learn more';

  @override
  String get kindMeasured => 'Measured';

  @override
  String get kindDetected => 'Detected automatically';

  @override
  String get kindRecommendation => 'Recommendation';

  @override
  String get historyTitle => 'Your scans';

  @override
  String get historySearch => 'Search by address';

  @override
  String get search => 'Search';

  @override
  String get loadMore => 'Load more';

  @override
  String get noMatches => 'No scans match that search';

  @override
  String get historyEmptyTitle => 'No saved scans yet';

  @override
  String get historyEmptyBody => 'Scans you run will be listed here so you can revisit them.';

  @override
  String get statusQueued => 'Queued';

  @override
  String get statusRunning => 'Running';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusPartial => 'Partial';

  @override
  String get statusFailed => 'Failed';

  @override
  String get accountTitle => 'Account';

  @override
  String get profileSection => 'Profile';

  @override
  String signedInAs(String email) {
    return 'Signed in as $email';
  }

  @override
  String get displayNameLabel => 'Display name';

  @override
  String get saveName => 'Save name';

  @override
  String get saved => 'Saved.';

  @override
  String get planSection => 'Plan and usage';

  @override
  String planDetails(int scans) {
    return '$scans scans per period';
  }

  @override
  String get paidComingSoon => 'Paid plans with more scans, PDF reports and share links are coming soon.';

  @override
  String get dataSection => 'Your data';

  @override
  String get exportOnWeb => 'You can download a copy of all your data from Account settings on the Weblume website.';

  @override
  String get openWebsite => 'Open account settings on the website';

  @override
  String get logOut => 'Log out';

  @override
  String get legalSection => 'Legal';

  @override
  String get accountPrivacy => 'Privacy policy';

  @override
  String get accountTerms => 'Terms of service';

  @override
  String get deleteSection => 'Delete account';

  @override
  String get deleteWarning =>
      'This permanently deletes your account, your saved reports and your settings. It can’t be undone. If you subscribed through Google Play, cancel the subscription in Google Play first — deleting your account doesn’t cancel it.';

  @override
  String get deleteConfirmLabel => 'Type \"DELETE\" to confirm';

  @override
  String get deleteButton => 'Permanently delete my account';

  @override
  String get deleting => 'Deleting…';

  @override
  String get deleteTypeError => 'Type DELETE (in capitals) to confirm.';

  @override
  String get accountDeleted => 'Your account and its data have been deleted.';

  @override
  String get accountDeletionPending =>
      'Your account data has been deleted. Your sign-in record will be removed shortly.';

  @override
  String accountVersion(String version) {
    return 'Version $version';
  }

  @override
  String criticalHighCount(int count) {
    return '$count critical/high';
  }
}
