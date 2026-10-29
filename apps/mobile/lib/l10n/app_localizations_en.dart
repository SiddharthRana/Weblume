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
  String get dashboardTitle => 'Dashboard';

  @override
  String get dashboardEmptyTitle => 'No scans yet';

  @override
  String get dashboardEmptyBody =>
      'Your recent scans and remaining usage will appear here.';

  @override
  String get newScanTitle => 'New scan';

  @override
  String get newScanUnavailableTitle => 'Scanning is coming soon';

  @override
  String get newScanUnavailableBody =>
      'You’ll be able to audit any public web page from here in an upcoming version.';

  @override
  String get historyTitle => 'Scan history';

  @override
  String get historyEmptyTitle => 'Nothing here yet';

  @override
  String get historyEmptyBody =>
      'Scans you run will be listed here so you can revisit and compare them.';

  @override
  String get accountTitle => 'Account';

  @override
  String get accountSignedOutTitle => 'Sign-in is coming soon';

  @override
  String get accountSignedOutBody =>
      'Accounts and subscriptions will be available in an upcoming version.';

  @override
  String get accountPrivacy => 'Privacy policy';

  @override
  String get accountTerms => 'Terms of service';

  @override
  String get accountDeleteInfo => 'How to delete your account';

  @override
  String accountVersion(String version) {
    return 'Version $version';
  }
}
