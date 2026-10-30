import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/utils/url_validation.dart';

/// Runs the same cases as packages/shared (TypeScript) so both validators agree on what's allowed.
void main() {
  final cases =
      jsonDecode(File('../../packages/shared/test/url-cases.json').readAsStringSync()) as Map<String, dynamic>;

  group('accepts the shared valid cases', () {
    for (final c in (cases['valid'] as List).cast<List<dynamic>>()) {
      test(c[0] as String, () => expect(checkUrl(c[0] as String).isOk, isTrue));
    }
  });

  group('rejects the shared invalid cases with the same code', () {
    for (final c in (cases['invalid'] as List).cast<List<dynamic>>()) {
      test('${c[0]} → ${c[1]}', () => expect(checkUrl(c[0] as String).code, c[1]));
    }
  });

  test('rejects over-long addresses', () => expect(checkUrl('https://${'a' * 2100}.com').code, 'too_long'));

  test('normalises for display', () {
    expect(checkUrl('  Example.COM/Path?q=1#frag ').url, 'https://example.com/Path?q=1');
    expect(checkUrl('http://example.com:80/a').url, 'http://example.com/a');
  });
}
