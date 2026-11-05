// Generates the Flutter app's API client from apps/api/openapi.json:
//   apps/mobile/lib/api/generated/models.g.dart  — immutable model classes + enums (fromJson/toJson)
//   apps/mobile/lib/api/generated/api.g.dart     — dio-based client, one method per operation
// Deterministic and dependency-free; the output is committed and checked in CI (pnpm openapi:check).
// Enums decode unknown values to `unknown` so older app versions survive new API values.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(readFileSync(join(root, 'apps/api/openapi.json'), 'utf8'));
const outDir = join(root, 'apps/mobile/lib/api/generated');
const HEADER = `// GENERATED FILE — do not edit. Source: apps/api/openapi.json (run \`pnpm openapi\`).
// ignore_for_file: type=lint, unused_import
`;

const RESERVED = new Set([
  'default',
  'class',
  'enum',
  'switch',
  'case',
  'new',
  'null',
  'true',
  'false',
  'is',
  'in',
  'var',
  'final',
  'const',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'try',
  'catch',
  'throw',
  'this',
  'super',
  'void',
  'with',
  'extends',
  'assert',
  'break',
  'continue',
  'external',
  'factory',
  'get',
  'set',
  'operator',
  'part',
  'rethrow',
  'static',
  'typedef',
  'import',
  'export',
  'library',
  'abstract',
  'dynamic',
  'late',
  'required',
]);

const pascal = (s) =>
  s.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_m, _sep, c) => c.toUpperCase());
const camel = (s) => {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};
const ident = (s) => {
  let id = camel(s);
  if (/^[0-9]/.test(id)) id = `v${id}`;
  return RESERVED.has(id) ? `${id}_` : id;
};
const className = (schemaName) =>
  schemaName.replace(/DtoClass$|Dto$/, '').replace(/^ApiError$/, 'ApiErrorBody');
const refName = (ref) => className(ref.split('/').pop());

const classes = []; // { name, props: [{ jsonKey, field, type, required, nullable, schema }] }
const enums = new Map(); // signature -> { name, values }
const classNames = new Set();

function enumFor(owner, prop, values) {
  const sig = values.join('|');
  if (enums.has(sig)) return enums.get(sig).name;
  let name = `${owner}${pascal(prop)}`;
  while ([...enums.values()].some((e) => e.name === name)) name += 'Value';
  enums.set(sig, { name, values });
  return name;
}

/** Resolves a schema to a Dart type descriptor, generating classes/enums for inline shapes. */
function typeOf(schema, owner, prop) {
  if (!schema) return { dart: 'Object', kind: 'any' };
  if (schema.$ref) return { dart: refName(schema.$ref), kind: 'model' };
  // Swagger wraps a $ref in allOf when it adds a description or nullable.
  if (schema.allOf?.length === 1 && schema.allOf[0].$ref)
    return { dart: refName(schema.allOf[0].$ref), kind: 'model' };
  if (schema.enum) return { dart: enumFor(owner, prop, schema.enum), kind: 'enum' };
  switch (schema.type) {
    case 'string':
      return schema.format === 'date-time'
        ? { dart: 'DateTime', kind: 'datetime' }
        : { dart: 'String', kind: 'prim' };
    case 'integer':
      return { dart: 'int', kind: 'int' };
    case 'number':
      return { dart: 'double', kind: 'double' };
    case 'boolean':
      return { dart: 'bool', kind: 'prim' };
    case 'array': {
      const item = typeOf(schema.items, owner, singular(prop));
      return { dart: `List<${item.dart}>`, kind: 'list', item };
    }
    case 'object':
      if (schema.properties && Object.keys(schema.properties).length) {
        const name = `${owner}${pascal(prop)}`;
        addClass(name, schema);
        return { dart: name, kind: 'model' };
      }
      return { dart: 'Map<String, dynamic>', kind: 'map' };
    default:
      return { dart: 'Object', kind: 'any' };
  }
}

const singular = (s) => s.replace(/ies$/, 'y').replace(/s$/, '');

function addClass(name, schema) {
  if (classNames.has(name)) return;
  classNames.add(name);
  const entry = { name, props: [] };
  classes.push(entry);
  const required = new Set(schema.required ?? []);
  for (const [key, ps] of Object.entries(schema.properties ?? {})) {
    entry.props.push({
      jsonKey: key,
      field: ident(key),
      type: typeOf(ps, name, key),
      required: required.has(key),
      nullable: Boolean(ps.nullable) || !required.has(key),
      description: ps.description,
    });
  }
}

for (const [name, schema] of Object.entries(spec.components.schemas))
  addClass(className(name), schema);

// ---------------------------------------------------------------- decoding / encoding expressions
function decode(t, expr) {
  switch (t.kind) {
    case 'model':
      return `${t.dart}.fromJson(${expr} as Map<String, dynamic>)`;
    case 'enum':
      return `${t.dart}.fromJson(${expr})`;
    case 'datetime':
      return `DateTime.parse(${expr} as String)`;
    case 'int':
      return `(${expr} as num).toInt()`;
    case 'double':
      return `(${expr} as num).toDouble()`;
    case 'list':
      return `(${expr} as List<dynamic>).map((e) => ${decode(t.item, 'e')}).toList()`;
    case 'map':
      return `Map<String, dynamic>.from(${expr} as Map)`;
    case 'any':
      return `${expr} as Object`;
    default:
      return `${expr} as ${t.dart}`;
  }
}

function encode(t, expr) {
  switch (t.kind) {
    case 'model':
      return `${expr}.toJson()`;
    case 'enum':
      return `${expr}.value`;
    case 'datetime':
      return `${expr}.toIso8601String()`;
    case 'list':
      return `${expr}.map((e) => ${encode(t.item, 'e')}).toList()`;
    default:
      return expr;
  }
}

// ---------------------------------------------------------------- models
function renderEnum({ name, values }) {
  const members = values.map((v) => `  ${ident(v)}('${v}'),`).join('\n');
  return `enum ${name} {
${members}
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const ${name}(this.value);
  final String value;

  static ${name} fromJson(Object? json) =>
      ${name}.values.firstWhere((e) => e.value == json, orElse: () => ${name}.unknown);
}`;
}

function renderClass({ name, props }) {
  const fields = props
    .map(
      (p) =>
        `${p.description ? `  /// ${p.description}\n` : ''}  final ${p.type.dart}${p.nullable ? '?' : ''} ${p.field};`,
    )
    .join('\n');
  const ctorArgs = props
    .map((p) => `    ${p.nullable && !p.required ? '' : 'required '}this.${p.field},`)
    .join('\n');
  const fromJson = props
    .map((p) => {
      const raw = `json['${p.jsonKey}']`;
      return p.nullable
        ? `      ${p.field}: ${raw} == null ? null : ${decode(p.type, raw)},`
        : `      ${p.field}: ${decode(p.type, raw)},`;
    })
    .join('\n');
  const toJson = props
    .map((p) => {
      if (!p.nullable) return `      '${p.jsonKey}': ${encode(p.type, p.field)},`;
      const val = encode(p.type, `${p.field}!`);
      // Optional fields are omitted when null; required-but-nullable ones are sent as null.
      return p.required
        ? `      '${p.jsonKey}': ${p.field} == null ? null : ${val},`
        : `      if (${p.field} != null) '${p.jsonKey}': ${val},`;
    })
    .join('\n');
  return `class ${name} {
  const ${name}(${props.length ? `{\n${ctorArgs}\n  }` : ''});

${fields}

  factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(
${fromJson}
      );

  Map<String, dynamic> toJson() => {
${toJson}
      };
}`;
}

const models = `${HEADER}
${[...enums.values()].map(renderEnum).join('\n\n')}

${classes.map(renderClass).join('\n\n')}
`;

// ---------------------------------------------------------------- client
const ops = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    const ok = Object.entries(op.responses).find(([code]) => code.startsWith('2'));
    const resSchema = ok?.[1]?.content?.['application/json']?.schema;
    // Binary downloads (e.g. application/pdf) are returned as raw bytes.
    const binary = Object.entries(ok?.[1]?.content ?? {}).some(
      ([type, c]) => type !== 'application/json' && c.schema?.format === 'binary',
    );
    const bodySchema = op.requestBody?.content?.['application/json']?.schema;
    ops.push({
      path,
      method: method.toUpperCase(),
      name: camel(op.operationId.replace('_', ' ')),
      summary: op.summary ?? op.description,
      params: (op.parameters ?? []).map((p) => ({
        name: p.name,
        in: p.in,
        required: Boolean(p.required),
        field: ident(p.name.replace(/^x-/, '')),
        type: typeOf(p.schema, 'Param', p.name),
      })),
      body: bodySchema ? typeOf(bodySchema, 'Body', op.operationId) : null,
      res: resSchema ? typeOf(resSchema, 'Response', op.operationId) : null,
      binary,
    });
  }
}

function renderOp(op) {
  const args = [];
  for (const p of op.params)
    args.push(`${p.required ? 'required ' : ''}${p.type.dart}${p.required ? '' : '?'} ${p.field}`);
  if (op.body) args.push(`required ${op.body.dart} body`);
  const sig = args.length ? `{${args.join(', ')}}` : '';
  const pathExpr = op.path.replace(
    /\{([^}]+)\}/g,
    (_m, n) => `\${Uri.encodeComponent(${ident(n)})}`,
  );
  const query = op.params.filter((p) => p.in === 'query');
  const headers = op.params.filter((p) => p.in === 'header');
  const ret = op.binary ? 'List<int>' : op.res ? op.res.dart : 'Map<String, dynamic>';
  const decodeRes = op.binary
    ? 'res.data as List<int>'
    : op.res
      ? decode(op.res, 'res.data')
      : // Untyped responses may have no body at all (e.g. 204 No Content): return an empty map.
        'res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{}';
  return `  ${op.summary ? `/// ${op.summary.split('\n')[0]}\n  ` : ''}Future<${ret}> ${op.name}(${sig}) => _call(() async {
        final res = await _dio.request<Object?>(
          '${pathExpr}',
          options: Options(method: '${op.method}'${op.binary ? ', responseType: ResponseType.bytes' : ''}${headers.length ? `, headers: {${headers.map((h) => `${h.required ? '' : `if (${h.field} != null) `}'${h.name}': ${h.field}`).join(', ')}}` : ''}),
          ${query.length ? `queryParameters: {${query.map((q) => `${q.required ? '' : `if (${q.field} != null) `}'${q.name}': ${encode(q.type, q.field)}`).join(', ')}},` : ''}
          ${op.body ? `data: ${encode(op.body, 'body')},` : ''}
        );
        return ${decodeRes};
      });`;
}

const api = `${HEADER}
import 'package:dio/dio.dart';

import 'models.g.dart';

/// Error returned by the Weblume API (or a network failure, with [statusCode] null).
class ApiException implements Exception {
  ApiException({this.statusCode, this.code, required this.message, this.body});

  final int? statusCode;
  /// Stable machine-readable code from the API, e.g. \`quota_exceeded\`.
  final String? code;
  final String message;
  final Map<String, dynamic>? body;

  bool get isNetworkError => statusCode == null;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      final msg = map['message'];
      return ApiException(
        statusCode: e.response?.statusCode,
        code: map['code'] as String?,
        message: msg is List ? msg.join(' ') : (msg as String? ?? 'Request failed'),
        body: map,
      );
    }
    return ApiException(statusCode: e.response?.statusCode, message: e.message ?? 'Network error');
  }

  @override
  String toString() => 'ApiException($statusCode, $code, $message)';
}

/// Typed Weblume API client. Configure auth (Authorization header) on the [Dio] instance.
class WeblumeApi {
  WeblumeApi(this._dio);

  final Dio _dio;

  Future<T> _call<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

${ops.map(renderOp).join('\n\n')}
}
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'models.g.dart'), models);
writeFileSync(join(outDir, 'api.g.dart'), api);
console.log(
  `Dart client generated: ${classes.length} models, ${enums.size} enums, ${ops.length} operations`,
);
