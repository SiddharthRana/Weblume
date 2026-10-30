/// Client-side URL checks mirroring packages/shared/src/url.ts. The API re-validates and
/// normalises authoritatively (IDN → punycode, alternative IPv4 notations, private-network checks).
enum UrlProblem { empty, tooLong, invalid, unsupportedScheme, credentialsNotAllowed, portNotAllowed, invalidHost }

class UrlCheck {
  const UrlCheck.ok(this.url) : problem = null;
  const UrlCheck.problem(this.problem) : url = null;

  /// Best-effort normalised URL for display; the server's value is authoritative.
  final String? url;
  final UrlProblem? problem;
  bool get isOk => problem == null;

  /// Stable code matching the shared/TypeScript implementation.
  String? get code => switch (problem) {
    null => null,
    UrlProblem.empty => 'empty',
    UrlProblem.tooLong => 'too_long',
    UrlProblem.invalid => 'invalid',
    UrlProblem.unsupportedScheme => 'unsupported_scheme',
    UrlProblem.credentialsNotAllowed => 'credentials_not_allowed',
    UrlProblem.portNotAllowed => 'port_not_allowed',
    UrlProblem.invalidHost => 'invalid_host',
  };
}

const maxUrlLength = 2048;
final _hasScheme = RegExp(r'^[a-z][a-z0-9+.-]*://', caseSensitive: false);
final _otherScheme = RegExp(
  r'^(javascript|data|file|mailto|ftp|gopher|ws|wss|blob|about|tel|view-source|chrome|vbscript):',
  caseSensitive: false,
);
final _badChars = RegExp(r'[\s<>"`\\^{}|]');
final _numericHost = RegExp(r'^(0x[0-9a-f]+|[0-9]+)(\.(0x[0-9a-f]+|[0-9]+))*$', caseSensitive: false);
const _reservedSuffixes = [
  '.localhost', '.local', '.internal', '.lan', '.home.arpa', '.test', '.invalid', '.example', '.onion', //
];

UrlCheck checkUrl(String input) {
  final raw = input.trim();
  if (raw.isEmpty) return const UrlCheck.problem(UrlProblem.empty);
  if (raw.length > maxUrlLength) return const UrlCheck.problem(UrlProblem.tooLong);
  if (_badChars.hasMatch(raw)) return const UrlCheck.problem(UrlProblem.invalid);

  var candidate = raw;
  if (!_hasScheme.hasMatch(raw)) {
    if (_otherScheme.hasMatch(raw)) return const UrlCheck.problem(UrlProblem.unsupportedScheme);
    candidate = 'https://$raw';
  }
  final Uri uri;
  try {
    uri = Uri.parse(candidate);
  } on FormatException {
    return const UrlCheck.problem(UrlProblem.invalid);
  }
  final scheme = uri.scheme.toLowerCase();
  if (scheme != 'http' && scheme != 'https') return const UrlCheck.problem(UrlProblem.unsupportedScheme);
  if (uri.userInfo.isNotEmpty) return const UrlCheck.problem(UrlProblem.credentialsNotAllowed);
  if (uri.hasPort && uri.port != 80 && uri.port != 443) return const UrlCheck.problem(UrlProblem.portNotAllowed);

  var host = Uri.decodeComponent(uri.host).toLowerCase();
  if (host.endsWith('.')) host = host.substring(0, host.length - 1);
  if (host.isEmpty) return const UrlCheck.problem(UrlProblem.invalidHost);
  final isIp = _numericHost.hasMatch(host) || uri.host.contains(':');
  if (!isIp) {
    if (!host.contains('.')) return const UrlCheck.problem(UrlProblem.invalidHost);
    if (host == 'localhost' || _reservedSuffixes.any(host.endsWith)) {
      return const UrlCheck.problem(UrlProblem.invalidHost);
    }
    if (host.split('.').any((l) => l.isEmpty || l.length > 63)) return const UrlCheck.problem(UrlProblem.invalidHost);
  }
  final defaultPort = (scheme == 'http' && uri.port == 80) || (scheme == 'https' && uri.port == 443);
  final display = Uri(
    scheme: scheme,
    host: host,
    port: uri.hasPort && !defaultPort ? uri.port : null,
    path: uri.path.isEmpty ? '/' : uri.path,
    query: uri.hasQuery ? uri.query : null,
  ).toString();
  return UrlCheck.ok(display);
}
