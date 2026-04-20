
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model RuedaSolicitud
 * 
 */
export type RuedaSolicitud = $Result.DefaultSelection<Prisma.$RuedaSolicitudPayload>
/**
 * Model RuedasFinal
 * 
 */
export type RuedasFinal = $Result.DefaultSelection<Prisma.$RuedasFinalPayload>
/**
 * Model RondaServicio
 * 
 */
export type RondaServicio = $Result.DefaultSelection<Prisma.$RondaServicioPayload>
/**
 * Model Nava
 * 
 */
export type Nava = $Result.DefaultSelection<Prisma.$NavaPayload>
/**
 * Model Cambio
 * 
 */
export type Cambio = $Result.DefaultSelection<Prisma.$CambioPayload>
/**
 * Model IncidenteTorno
 * 
 */
export type IncidenteTorno = $Result.DefaultSelection<Prisma.$IncidenteTornoPayload>
/**
 * Model IncidenteTornoHijo
 * 
 */
export type IncidenteTornoHijo = $Result.DefaultSelection<Prisma.$IncidenteTornoHijoPayload>
/**
 * Model TornoG
 * 
 */
export type TornoG = $Result.DefaultSelection<Prisma.$TornoGPayload>
/**
 * Model TornoRuedaTrabajo
 * 
 */
export type TornoRuedaTrabajo = $Result.DefaultSelection<Prisma.$TornoRuedaTrabajoPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const TipoFallaTorno: {
  FALLO_SISTEMA: 'FALLO_SISTEMA',
  NAVAJAS: 'NAVAJAS'
};

export type TipoFallaTorno = (typeof TipoFallaTorno)[keyof typeof TipoFallaTorno]


export const EstadoIncidenteTornoPadre: {
  EN_PROCESO: 'EN_PROCESO',
  RESUELTO: 'RESUELTO'
};

export type EstadoIncidenteTornoPadre = (typeof EstadoIncidenteTornoPadre)[keyof typeof EstadoIncidenteTornoPadre]


export const EstadoIncidenteTornoHijo: {
  EN_PROCESO: 'EN_PROCESO',
  RESUELTO: 'RESUELTO'
};

export type EstadoIncidenteTornoHijo = (typeof EstadoIncidenteTornoHijo)[keyof typeof EstadoIncidenteTornoHijo]


export const EstadoRondaServicio: {
  SOLICITADO: 'SOLICITADO',
  EN_PROCESO: 'EN_PROCESO',
  CONCLUIDO: 'CONCLUIDO',
  DETENIDO: 'DETENIDO',
  CANCELADO: 'CANCELADO'
};

export type EstadoRondaServicio = (typeof EstadoRondaServicio)[keyof typeof EstadoRondaServicio]


export const EstadoTornoG: {
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  PAUSADO: 'PAUSADO',
  TERMINADO: 'TERMINADO'
};

export type EstadoTornoG = (typeof EstadoTornoG)[keyof typeof EstadoTornoG]


export const EstadoTornoRueda: {
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  PAUSADO: 'PAUSADO',
  TERMINADO: 'TERMINADO'
};

export type EstadoTornoRueda = (typeof EstadoTornoRueda)[keyof typeof EstadoTornoRueda]


export const LadoRueda: {
  L: 'L',
  R: 'R'
};

export type LadoRueda = (typeof LadoRueda)[keyof typeof LadoRueda]

}

export type TipoFallaTorno = $Enums.TipoFallaTorno

export const TipoFallaTorno: typeof $Enums.TipoFallaTorno

export type EstadoIncidenteTornoPadre = $Enums.EstadoIncidenteTornoPadre

export const EstadoIncidenteTornoPadre: typeof $Enums.EstadoIncidenteTornoPadre

export type EstadoIncidenteTornoHijo = $Enums.EstadoIncidenteTornoHijo

export const EstadoIncidenteTornoHijo: typeof $Enums.EstadoIncidenteTornoHijo

export type EstadoRondaServicio = $Enums.EstadoRondaServicio

export const EstadoRondaServicio: typeof $Enums.EstadoRondaServicio

export type EstadoTornoG = $Enums.EstadoTornoG

export const EstadoTornoG: typeof $Enums.EstadoTornoG

export type EstadoTornoRueda = $Enums.EstadoTornoRueda

export const EstadoTornoRueda: typeof $Enums.EstadoTornoRueda

export type LadoRueda = $Enums.LadoRueda

export const LadoRueda: typeof $Enums.LadoRueda

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more RuedaSolicituds
 * const ruedaSolicituds = await prisma.ruedaSolicitud.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more RuedaSolicituds
   * const ruedaSolicituds = await prisma.ruedaSolicitud.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.ruedaSolicitud`: Exposes CRUD operations for the **RuedaSolicitud** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RuedaSolicituds
    * const ruedaSolicituds = await prisma.ruedaSolicitud.findMany()
    * ```
    */
  get ruedaSolicitud(): Prisma.RuedaSolicitudDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ruedasFinal`: Exposes CRUD operations for the **RuedasFinal** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RuedasFinals
    * const ruedasFinals = await prisma.ruedasFinal.findMany()
    * ```
    */
  get ruedasFinal(): Prisma.RuedasFinalDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rondaServicio`: Exposes CRUD operations for the **RondaServicio** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RondaServicios
    * const rondaServicios = await prisma.rondaServicio.findMany()
    * ```
    */
  get rondaServicio(): Prisma.RondaServicioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nava`: Exposes CRUD operations for the **Nava** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Navas
    * const navas = await prisma.nava.findMany()
    * ```
    */
  get nava(): Prisma.NavaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cambio`: Exposes CRUD operations for the **Cambio** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Cambios
    * const cambios = await prisma.cambio.findMany()
    * ```
    */
  get cambio(): Prisma.CambioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.incidenteTorno`: Exposes CRUD operations for the **IncidenteTorno** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IncidenteTornos
    * const incidenteTornos = await prisma.incidenteTorno.findMany()
    * ```
    */
  get incidenteTorno(): Prisma.IncidenteTornoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.incidenteTornoHijo`: Exposes CRUD operations for the **IncidenteTornoHijo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IncidenteTornoHijos
    * const incidenteTornoHijos = await prisma.incidenteTornoHijo.findMany()
    * ```
    */
  get incidenteTornoHijo(): Prisma.IncidenteTornoHijoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tornoG`: Exposes CRUD operations for the **TornoG** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TornoGS
    * const tornoGS = await prisma.tornoG.findMany()
    * ```
    */
  get tornoG(): Prisma.TornoGDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tornoRuedaTrabajo`: Exposes CRUD operations for the **TornoRuedaTrabajo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TornoRuedaTrabajos
    * const tornoRuedaTrabajos = await prisma.tornoRuedaTrabajo.findMany()
    * ```
    */
  get tornoRuedaTrabajo(): Prisma.TornoRuedaTrabajoDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    RuedaSolicitud: 'RuedaSolicitud',
    RuedasFinal: 'RuedasFinal',
    RondaServicio: 'RondaServicio',
    Nava: 'Nava',
    Cambio: 'Cambio',
    IncidenteTorno: 'IncidenteTorno',
    IncidenteTornoHijo: 'IncidenteTornoHijo',
    TornoG: 'TornoG',
    TornoRuedaTrabajo: 'TornoRuedaTrabajo'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "ruedaSolicitud" | "ruedasFinal" | "rondaServicio" | "nava" | "cambio" | "incidenteTorno" | "incidenteTornoHijo" | "tornoG" | "tornoRuedaTrabajo"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      RuedaSolicitud: {
        payload: Prisma.$RuedaSolicitudPayload<ExtArgs>
        fields: Prisma.RuedaSolicitudFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuedaSolicitudFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuedaSolicitudFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          findFirst: {
            args: Prisma.RuedaSolicitudFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuedaSolicitudFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          findMany: {
            args: Prisma.RuedaSolicitudFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>[]
          }
          create: {
            args: Prisma.RuedaSolicitudCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          createMany: {
            args: Prisma.RuedaSolicitudCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuedaSolicitudCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>[]
          }
          delete: {
            args: Prisma.RuedaSolicitudDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          update: {
            args: Prisma.RuedaSolicitudUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          deleteMany: {
            args: Prisma.RuedaSolicitudDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuedaSolicitudUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RuedaSolicitudUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>[]
          }
          upsert: {
            args: Prisma.RuedaSolicitudUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedaSolicitudPayload>
          }
          aggregate: {
            args: Prisma.RuedaSolicitudAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuedaSolicitud>
          }
          groupBy: {
            args: Prisma.RuedaSolicitudGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuedaSolicitudGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuedaSolicitudCountArgs<ExtArgs>
            result: $Utils.Optional<RuedaSolicitudCountAggregateOutputType> | number
          }
        }
      }
      RuedasFinal: {
        payload: Prisma.$RuedasFinalPayload<ExtArgs>
        fields: Prisma.RuedasFinalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuedasFinalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuedasFinalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          findFirst: {
            args: Prisma.RuedasFinalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuedasFinalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          findMany: {
            args: Prisma.RuedasFinalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>[]
          }
          create: {
            args: Prisma.RuedasFinalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          createMany: {
            args: Prisma.RuedasFinalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuedasFinalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>[]
          }
          delete: {
            args: Prisma.RuedasFinalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          update: {
            args: Prisma.RuedasFinalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          deleteMany: {
            args: Prisma.RuedasFinalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuedasFinalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RuedasFinalUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>[]
          }
          upsert: {
            args: Prisma.RuedasFinalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuedasFinalPayload>
          }
          aggregate: {
            args: Prisma.RuedasFinalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuedasFinal>
          }
          groupBy: {
            args: Prisma.RuedasFinalGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuedasFinalGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuedasFinalCountArgs<ExtArgs>
            result: $Utils.Optional<RuedasFinalCountAggregateOutputType> | number
          }
        }
      }
      RondaServicio: {
        payload: Prisma.$RondaServicioPayload<ExtArgs>
        fields: Prisma.RondaServicioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RondaServicioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RondaServicioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          findFirst: {
            args: Prisma.RondaServicioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RondaServicioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          findMany: {
            args: Prisma.RondaServicioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>[]
          }
          create: {
            args: Prisma.RondaServicioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          createMany: {
            args: Prisma.RondaServicioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RondaServicioCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>[]
          }
          delete: {
            args: Prisma.RondaServicioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          update: {
            args: Prisma.RondaServicioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          deleteMany: {
            args: Prisma.RondaServicioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RondaServicioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RondaServicioUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>[]
          }
          upsert: {
            args: Prisma.RondaServicioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaServicioPayload>
          }
          aggregate: {
            args: Prisma.RondaServicioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRondaServicio>
          }
          groupBy: {
            args: Prisma.RondaServicioGroupByArgs<ExtArgs>
            result: $Utils.Optional<RondaServicioGroupByOutputType>[]
          }
          count: {
            args: Prisma.RondaServicioCountArgs<ExtArgs>
            result: $Utils.Optional<RondaServicioCountAggregateOutputType> | number
          }
        }
      }
      Nava: {
        payload: Prisma.$NavaPayload<ExtArgs>
        fields: Prisma.NavaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.NavaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.NavaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          findFirst: {
            args: Prisma.NavaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.NavaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          findMany: {
            args: Prisma.NavaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>[]
          }
          create: {
            args: Prisma.NavaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          createMany: {
            args: Prisma.NavaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.NavaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>[]
          }
          delete: {
            args: Prisma.NavaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          update: {
            args: Prisma.NavaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          deleteMany: {
            args: Prisma.NavaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.NavaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.NavaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>[]
          }
          upsert: {
            args: Prisma.NavaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NavaPayload>
          }
          aggregate: {
            args: Prisma.NavaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNava>
          }
          groupBy: {
            args: Prisma.NavaGroupByArgs<ExtArgs>
            result: $Utils.Optional<NavaGroupByOutputType>[]
          }
          count: {
            args: Prisma.NavaCountArgs<ExtArgs>
            result: $Utils.Optional<NavaCountAggregateOutputType> | number
          }
        }
      }
      Cambio: {
        payload: Prisma.$CambioPayload<ExtArgs>
        fields: Prisma.CambioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CambioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CambioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          findFirst: {
            args: Prisma.CambioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CambioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          findMany: {
            args: Prisma.CambioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>[]
          }
          create: {
            args: Prisma.CambioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          createMany: {
            args: Prisma.CambioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CambioCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>[]
          }
          delete: {
            args: Prisma.CambioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          update: {
            args: Prisma.CambioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          deleteMany: {
            args: Prisma.CambioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CambioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CambioUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>[]
          }
          upsert: {
            args: Prisma.CambioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CambioPayload>
          }
          aggregate: {
            args: Prisma.CambioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCambio>
          }
          groupBy: {
            args: Prisma.CambioGroupByArgs<ExtArgs>
            result: $Utils.Optional<CambioGroupByOutputType>[]
          }
          count: {
            args: Prisma.CambioCountArgs<ExtArgs>
            result: $Utils.Optional<CambioCountAggregateOutputType> | number
          }
        }
      }
      IncidenteTorno: {
        payload: Prisma.$IncidenteTornoPayload<ExtArgs>
        fields: Prisma.IncidenteTornoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IncidenteTornoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IncidenteTornoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          findFirst: {
            args: Prisma.IncidenteTornoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IncidenteTornoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          findMany: {
            args: Prisma.IncidenteTornoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>[]
          }
          create: {
            args: Prisma.IncidenteTornoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          createMany: {
            args: Prisma.IncidenteTornoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.IncidenteTornoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>[]
          }
          delete: {
            args: Prisma.IncidenteTornoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          update: {
            args: Prisma.IncidenteTornoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          deleteMany: {
            args: Prisma.IncidenteTornoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IncidenteTornoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.IncidenteTornoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>[]
          }
          upsert: {
            args: Prisma.IncidenteTornoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoPayload>
          }
          aggregate: {
            args: Prisma.IncidenteTornoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIncidenteTorno>
          }
          groupBy: {
            args: Prisma.IncidenteTornoGroupByArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTornoGroupByOutputType>[]
          }
          count: {
            args: Prisma.IncidenteTornoCountArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTornoCountAggregateOutputType> | number
          }
        }
      }
      IncidenteTornoHijo: {
        payload: Prisma.$IncidenteTornoHijoPayload<ExtArgs>
        fields: Prisma.IncidenteTornoHijoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IncidenteTornoHijoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IncidenteTornoHijoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          findFirst: {
            args: Prisma.IncidenteTornoHijoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IncidenteTornoHijoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          findMany: {
            args: Prisma.IncidenteTornoHijoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>[]
          }
          create: {
            args: Prisma.IncidenteTornoHijoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          createMany: {
            args: Prisma.IncidenteTornoHijoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.IncidenteTornoHijoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>[]
          }
          delete: {
            args: Prisma.IncidenteTornoHijoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          update: {
            args: Prisma.IncidenteTornoHijoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          deleteMany: {
            args: Prisma.IncidenteTornoHijoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IncidenteTornoHijoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.IncidenteTornoHijoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>[]
          }
          upsert: {
            args: Prisma.IncidenteTornoHijoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTornoHijoPayload>
          }
          aggregate: {
            args: Prisma.IncidenteTornoHijoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIncidenteTornoHijo>
          }
          groupBy: {
            args: Prisma.IncidenteTornoHijoGroupByArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTornoHijoGroupByOutputType>[]
          }
          count: {
            args: Prisma.IncidenteTornoHijoCountArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTornoHijoCountAggregateOutputType> | number
          }
        }
      }
      TornoG: {
        payload: Prisma.$TornoGPayload<ExtArgs>
        fields: Prisma.TornoGFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TornoGFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TornoGFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          findFirst: {
            args: Prisma.TornoGFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TornoGFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          findMany: {
            args: Prisma.TornoGFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>[]
          }
          create: {
            args: Prisma.TornoGCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          createMany: {
            args: Prisma.TornoGCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TornoGCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>[]
          }
          delete: {
            args: Prisma.TornoGDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          update: {
            args: Prisma.TornoGUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          deleteMany: {
            args: Prisma.TornoGDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TornoGUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TornoGUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>[]
          }
          upsert: {
            args: Prisma.TornoGUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoGPayload>
          }
          aggregate: {
            args: Prisma.TornoGAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTornoG>
          }
          groupBy: {
            args: Prisma.TornoGGroupByArgs<ExtArgs>
            result: $Utils.Optional<TornoGGroupByOutputType>[]
          }
          count: {
            args: Prisma.TornoGCountArgs<ExtArgs>
            result: $Utils.Optional<TornoGCountAggregateOutputType> | number
          }
        }
      }
      TornoRuedaTrabajo: {
        payload: Prisma.$TornoRuedaTrabajoPayload<ExtArgs>
        fields: Prisma.TornoRuedaTrabajoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TornoRuedaTrabajoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TornoRuedaTrabajoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          findFirst: {
            args: Prisma.TornoRuedaTrabajoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TornoRuedaTrabajoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          findMany: {
            args: Prisma.TornoRuedaTrabajoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>[]
          }
          create: {
            args: Prisma.TornoRuedaTrabajoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          createMany: {
            args: Prisma.TornoRuedaTrabajoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TornoRuedaTrabajoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>[]
          }
          delete: {
            args: Prisma.TornoRuedaTrabajoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          update: {
            args: Prisma.TornoRuedaTrabajoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          deleteMany: {
            args: Prisma.TornoRuedaTrabajoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TornoRuedaTrabajoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TornoRuedaTrabajoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>[]
          }
          upsert: {
            args: Prisma.TornoRuedaTrabajoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TornoRuedaTrabajoPayload>
          }
          aggregate: {
            args: Prisma.TornoRuedaTrabajoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTornoRuedaTrabajo>
          }
          groupBy: {
            args: Prisma.TornoRuedaTrabajoGroupByArgs<ExtArgs>
            result: $Utils.Optional<TornoRuedaTrabajoGroupByOutputType>[]
          }
          count: {
            args: Prisma.TornoRuedaTrabajoCountArgs<ExtArgs>
            result: $Utils.Optional<TornoRuedaTrabajoCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    ruedaSolicitud?: RuedaSolicitudOmit
    ruedasFinal?: RuedasFinalOmit
    rondaServicio?: RondaServicioOmit
    nava?: NavaOmit
    cambio?: CambioOmit
    incidenteTorno?: IncidenteTornoOmit
    incidenteTornoHijo?: IncidenteTornoHijoOmit
    tornoG?: TornoGOmit
    tornoRuedaTrabajo?: TornoRuedaTrabajoOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type RuedaSolicitudCountOutputType
   */

  export type RuedaSolicitudCountOutputType = {
    tornoG: number
    incidentes: number
  }

  export type RuedaSolicitudCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tornoG?: boolean | RuedaSolicitudCountOutputTypeCountTornoGArgs
    incidentes?: boolean | RuedaSolicitudCountOutputTypeCountIncidentesArgs
  }

  // Custom InputTypes
  /**
   * RuedaSolicitudCountOutputType without action
   */
  export type RuedaSolicitudCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitudCountOutputType
     */
    select?: RuedaSolicitudCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RuedaSolicitudCountOutputType without action
   */
  export type RuedaSolicitudCountOutputTypeCountTornoGArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TornoGWhereInput
  }

  /**
   * RuedaSolicitudCountOutputType without action
   */
  export type RuedaSolicitudCountOutputTypeCountIncidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTornoWhereInput
  }


  /**
   * Count Type RuedasFinalCountOutputType
   */

  export type RuedasFinalCountOutputType = {
    tornoG: number
  }

  export type RuedasFinalCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tornoG?: boolean | RuedasFinalCountOutputTypeCountTornoGArgs
  }

  // Custom InputTypes
  /**
   * RuedasFinalCountOutputType without action
   */
  export type RuedasFinalCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinalCountOutputType
     */
    select?: RuedasFinalCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RuedasFinalCountOutputType without action
   */
  export type RuedasFinalCountOutputTypeCountTornoGArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TornoGWhereInput
  }


  /**
   * Count Type RondaServicioCountOutputType
   */

  export type RondaServicioCountOutputType = {
    incidentes: number
  }

  export type RondaServicioCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidentes?: boolean | RondaServicioCountOutputTypeCountIncidentesArgs
  }

  // Custom InputTypes
  /**
   * RondaServicioCountOutputType without action
   */
  export type RondaServicioCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicioCountOutputType
     */
    select?: RondaServicioCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RondaServicioCountOutputType without action
   */
  export type RondaServicioCountOutputTypeCountIncidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTornoWhereInput
  }


  /**
   * Count Type NavaCountOutputType
   */

  export type NavaCountOutputType = {
    cambios: number
  }

  export type NavaCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cambios?: boolean | NavaCountOutputTypeCountCambiosArgs
  }

  // Custom InputTypes
  /**
   * NavaCountOutputType without action
   */
  export type NavaCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NavaCountOutputType
     */
    select?: NavaCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * NavaCountOutputType without action
   */
  export type NavaCountOutputTypeCountCambiosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CambioWhereInput
  }


  /**
   * Count Type IncidenteTornoCountOutputType
   */

  export type IncidenteTornoCountOutputType = {
    rondasDetenidas: number
    rondasCanceladas: number
    hijos: number
  }

  export type IncidenteTornoCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondasDetenidas?: boolean | IncidenteTornoCountOutputTypeCountRondasDetenidasArgs
    rondasCanceladas?: boolean | IncidenteTornoCountOutputTypeCountRondasCanceladasArgs
    hijos?: boolean | IncidenteTornoCountOutputTypeCountHijosArgs
  }

  // Custom InputTypes
  /**
   * IncidenteTornoCountOutputType without action
   */
  export type IncidenteTornoCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoCountOutputType
     */
    select?: IncidenteTornoCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * IncidenteTornoCountOutputType without action
   */
  export type IncidenteTornoCountOutputTypeCountRondasDetenidasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaServicioWhereInput
  }

  /**
   * IncidenteTornoCountOutputType without action
   */
  export type IncidenteTornoCountOutputTypeCountRondasCanceladasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaServicioWhereInput
  }

  /**
   * IncidenteTornoCountOutputType without action
   */
  export type IncidenteTornoCountOutputTypeCountHijosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTornoHijoWhereInput
  }


  /**
   * Count Type TornoGCountOutputType
   */

  export type TornoGCountOutputType = {
    detalleRuedas: number
  }

  export type TornoGCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    detalleRuedas?: boolean | TornoGCountOutputTypeCountDetalleRuedasArgs
  }

  // Custom InputTypes
  /**
   * TornoGCountOutputType without action
   */
  export type TornoGCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoGCountOutputType
     */
    select?: TornoGCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TornoGCountOutputType without action
   */
  export type TornoGCountOutputTypeCountDetalleRuedasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TornoRuedaTrabajoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model RuedaSolicitud
   */

  export type AggregateRuedaSolicitud = {
    _count: RuedaSolicitudCountAggregateOutputType | null
    _avg: RuedaSolicitudAvgAggregateOutputType | null
    _sum: RuedaSolicitudSumAggregateOutputType | null
    _min: RuedaSolicitudMinAggregateOutputType | null
    _max: RuedaSolicitudMaxAggregateOutputType | null
  }

  export type RuedaSolicitudAvgAggregateOutputType = {
    id: number | null
    movimientoId: number | null
  }

  export type RuedaSolicitudSumAggregateOutputType = {
    id: number | null
    movimientoId: number | null
  }

  export type RuedaSolicitudMinAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    l1: string | null
    l2: string | null
    l3: string | null
    l4: string | null
    l5: string | null
    l6: string | null
    r1: string | null
    r2: string | null
    r3: string | null
    r4: string | null
    r5: string | null
    r6: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuedaSolicitudMaxAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    l1: string | null
    l2: string | null
    l3: string | null
    l4: string | null
    l5: string | null
    l6: string | null
    r1: string | null
    r2: string | null
    r3: string | null
    r4: string | null
    r5: string | null
    r6: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuedaSolicitudCountAggregateOutputType = {
    id: number
    movimientoId: number
    l1: number
    l2: number
    l3: number
    l4: number
    l5: number
    l6: number
    r1: number
    r2: number
    r3: number
    r4: number
    r5: number
    r6: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RuedaSolicitudAvgAggregateInputType = {
    id?: true
    movimientoId?: true
  }

  export type RuedaSolicitudSumAggregateInputType = {
    id?: true
    movimientoId?: true
  }

  export type RuedaSolicitudMinAggregateInputType = {
    id?: true
    movimientoId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuedaSolicitudMaxAggregateInputType = {
    id?: true
    movimientoId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuedaSolicitudCountAggregateInputType = {
    id?: true
    movimientoId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RuedaSolicitudAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuedaSolicitud to aggregate.
     */
    where?: RuedaSolicitudWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedaSolicituds to fetch.
     */
    orderBy?: RuedaSolicitudOrderByWithRelationInput | RuedaSolicitudOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuedaSolicitudWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedaSolicituds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedaSolicituds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RuedaSolicituds
    **/
    _count?: true | RuedaSolicitudCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RuedaSolicitudAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RuedaSolicitudSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuedaSolicitudMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuedaSolicitudMaxAggregateInputType
  }

  export type GetRuedaSolicitudAggregateType<T extends RuedaSolicitudAggregateArgs> = {
        [P in keyof T & keyof AggregateRuedaSolicitud]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuedaSolicitud[P]>
      : GetScalarType<T[P], AggregateRuedaSolicitud[P]>
  }




  export type RuedaSolicitudGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuedaSolicitudWhereInput
    orderBy?: RuedaSolicitudOrderByWithAggregationInput | RuedaSolicitudOrderByWithAggregationInput[]
    by: RuedaSolicitudScalarFieldEnum[] | RuedaSolicitudScalarFieldEnum
    having?: RuedaSolicitudScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuedaSolicitudCountAggregateInputType | true
    _avg?: RuedaSolicitudAvgAggregateInputType
    _sum?: RuedaSolicitudSumAggregateInputType
    _min?: RuedaSolicitudMinAggregateInputType
    _max?: RuedaSolicitudMaxAggregateInputType
  }

  export type RuedaSolicitudGroupByOutputType = {
    id: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt: Date
    updatedAt: Date
    _count: RuedaSolicitudCountAggregateOutputType | null
    _avg: RuedaSolicitudAvgAggregateOutputType | null
    _sum: RuedaSolicitudSumAggregateOutputType | null
    _min: RuedaSolicitudMinAggregateOutputType | null
    _max: RuedaSolicitudMaxAggregateOutputType | null
  }

  type GetRuedaSolicitudGroupByPayload<T extends RuedaSolicitudGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuedaSolicitudGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuedaSolicitudGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuedaSolicitudGroupByOutputType[P]>
            : GetScalarType<T[P], RuedaSolicitudGroupByOutputType[P]>
        }
      >
    >


  export type RuedaSolicitudSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedasFinal?: boolean | RuedaSolicitud$ruedasFinalArgs<ExtArgs>
    rondaServicio?: boolean | RuedaSolicitud$rondaServicioArgs<ExtArgs>
    tornoG?: boolean | RuedaSolicitud$tornoGArgs<ExtArgs>
    incidentes?: boolean | RuedaSolicitud$incidentesArgs<ExtArgs>
    _count?: boolean | RuedaSolicitudCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ruedaSolicitud"]>

  export type RuedaSolicitudSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ruedaSolicitud"]>

  export type RuedaSolicitudSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ruedaSolicitud"]>

  export type RuedaSolicitudSelectScalar = {
    id?: boolean
    movimientoId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RuedaSolicitudOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "movimientoId" | "l1" | "l2" | "l3" | "l4" | "l5" | "l6" | "r1" | "r2" | "r3" | "r4" | "r5" | "r6" | "createdAt" | "updatedAt", ExtArgs["result"]["ruedaSolicitud"]>
  export type RuedaSolicitudInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedasFinal?: boolean | RuedaSolicitud$ruedasFinalArgs<ExtArgs>
    rondaServicio?: boolean | RuedaSolicitud$rondaServicioArgs<ExtArgs>
    tornoG?: boolean | RuedaSolicitud$tornoGArgs<ExtArgs>
    incidentes?: boolean | RuedaSolicitud$incidentesArgs<ExtArgs>
    _count?: boolean | RuedaSolicitudCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RuedaSolicitudIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type RuedaSolicitudIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $RuedaSolicitudPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RuedaSolicitud"
    objects: {
      ruedasFinal: Prisma.$RuedasFinalPayload<ExtArgs> | null
      rondaServicio: Prisma.$RondaServicioPayload<ExtArgs> | null
      tornoG: Prisma.$TornoGPayload<ExtArgs>[]
      incidentes: Prisma.$IncidenteTornoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      movimientoId: number
      l1: string
      l2: string
      l3: string
      l4: string
      l5: string
      l6: string
      r1: string
      r2: string
      r3: string
      r4: string
      r5: string
      r6: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["ruedaSolicitud"]>
    composites: {}
  }

  type RuedaSolicitudGetPayload<S extends boolean | null | undefined | RuedaSolicitudDefaultArgs> = $Result.GetResult<Prisma.$RuedaSolicitudPayload, S>

  type RuedaSolicitudCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RuedaSolicitudFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RuedaSolicitudCountAggregateInputType | true
    }

  export interface RuedaSolicitudDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RuedaSolicitud'], meta: { name: 'RuedaSolicitud' } }
    /**
     * Find zero or one RuedaSolicitud that matches the filter.
     * @param {RuedaSolicitudFindUniqueArgs} args - Arguments to find a RuedaSolicitud
     * @example
     * // Get one RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuedaSolicitudFindUniqueArgs>(args: SelectSubset<T, RuedaSolicitudFindUniqueArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RuedaSolicitud that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RuedaSolicitudFindUniqueOrThrowArgs} args - Arguments to find a RuedaSolicitud
     * @example
     * // Get one RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuedaSolicitudFindUniqueOrThrowArgs>(args: SelectSubset<T, RuedaSolicitudFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RuedaSolicitud that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudFindFirstArgs} args - Arguments to find a RuedaSolicitud
     * @example
     * // Get one RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuedaSolicitudFindFirstArgs>(args?: SelectSubset<T, RuedaSolicitudFindFirstArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RuedaSolicitud that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudFindFirstOrThrowArgs} args - Arguments to find a RuedaSolicitud
     * @example
     * // Get one RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuedaSolicitudFindFirstOrThrowArgs>(args?: SelectSubset<T, RuedaSolicitudFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RuedaSolicituds that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RuedaSolicituds
     * const ruedaSolicituds = await prisma.ruedaSolicitud.findMany()
     * 
     * // Get first 10 RuedaSolicituds
     * const ruedaSolicituds = await prisma.ruedaSolicitud.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ruedaSolicitudWithIdOnly = await prisma.ruedaSolicitud.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuedaSolicitudFindManyArgs>(args?: SelectSubset<T, RuedaSolicitudFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RuedaSolicitud.
     * @param {RuedaSolicitudCreateArgs} args - Arguments to create a RuedaSolicitud.
     * @example
     * // Create one RuedaSolicitud
     * const RuedaSolicitud = await prisma.ruedaSolicitud.create({
     *   data: {
     *     // ... data to create a RuedaSolicitud
     *   }
     * })
     * 
     */
    create<T extends RuedaSolicitudCreateArgs>(args: SelectSubset<T, RuedaSolicitudCreateArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RuedaSolicituds.
     * @param {RuedaSolicitudCreateManyArgs} args - Arguments to create many RuedaSolicituds.
     * @example
     * // Create many RuedaSolicituds
     * const ruedaSolicitud = await prisma.ruedaSolicitud.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuedaSolicitudCreateManyArgs>(args?: SelectSubset<T, RuedaSolicitudCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RuedaSolicituds and returns the data saved in the database.
     * @param {RuedaSolicitudCreateManyAndReturnArgs} args - Arguments to create many RuedaSolicituds.
     * @example
     * // Create many RuedaSolicituds
     * const ruedaSolicitud = await prisma.ruedaSolicitud.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RuedaSolicituds and only return the `id`
     * const ruedaSolicitudWithIdOnly = await prisma.ruedaSolicitud.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuedaSolicitudCreateManyAndReturnArgs>(args?: SelectSubset<T, RuedaSolicitudCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RuedaSolicitud.
     * @param {RuedaSolicitudDeleteArgs} args - Arguments to delete one RuedaSolicitud.
     * @example
     * // Delete one RuedaSolicitud
     * const RuedaSolicitud = await prisma.ruedaSolicitud.delete({
     *   where: {
     *     // ... filter to delete one RuedaSolicitud
     *   }
     * })
     * 
     */
    delete<T extends RuedaSolicitudDeleteArgs>(args: SelectSubset<T, RuedaSolicitudDeleteArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RuedaSolicitud.
     * @param {RuedaSolicitudUpdateArgs} args - Arguments to update one RuedaSolicitud.
     * @example
     * // Update one RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuedaSolicitudUpdateArgs>(args: SelectSubset<T, RuedaSolicitudUpdateArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RuedaSolicituds.
     * @param {RuedaSolicitudDeleteManyArgs} args - Arguments to filter RuedaSolicituds to delete.
     * @example
     * // Delete a few RuedaSolicituds
     * const { count } = await prisma.ruedaSolicitud.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuedaSolicitudDeleteManyArgs>(args?: SelectSubset<T, RuedaSolicitudDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuedaSolicituds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RuedaSolicituds
     * const ruedaSolicitud = await prisma.ruedaSolicitud.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuedaSolicitudUpdateManyArgs>(args: SelectSubset<T, RuedaSolicitudUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuedaSolicituds and returns the data updated in the database.
     * @param {RuedaSolicitudUpdateManyAndReturnArgs} args - Arguments to update many RuedaSolicituds.
     * @example
     * // Update many RuedaSolicituds
     * const ruedaSolicitud = await prisma.ruedaSolicitud.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RuedaSolicituds and only return the `id`
     * const ruedaSolicitudWithIdOnly = await prisma.ruedaSolicitud.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RuedaSolicitudUpdateManyAndReturnArgs>(args: SelectSubset<T, RuedaSolicitudUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RuedaSolicitud.
     * @param {RuedaSolicitudUpsertArgs} args - Arguments to update or create a RuedaSolicitud.
     * @example
     * // Update or create a RuedaSolicitud
     * const ruedaSolicitud = await prisma.ruedaSolicitud.upsert({
     *   create: {
     *     // ... data to create a RuedaSolicitud
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RuedaSolicitud we want to update
     *   }
     * })
     */
    upsert<T extends RuedaSolicitudUpsertArgs>(args: SelectSubset<T, RuedaSolicitudUpsertArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RuedaSolicituds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudCountArgs} args - Arguments to filter RuedaSolicituds to count.
     * @example
     * // Count the number of RuedaSolicituds
     * const count = await prisma.ruedaSolicitud.count({
     *   where: {
     *     // ... the filter for the RuedaSolicituds we want to count
     *   }
     * })
    **/
    count<T extends RuedaSolicitudCountArgs>(
      args?: Subset<T, RuedaSolicitudCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuedaSolicitudCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RuedaSolicitud.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RuedaSolicitudAggregateArgs>(args: Subset<T, RuedaSolicitudAggregateArgs>): Prisma.PrismaPromise<GetRuedaSolicitudAggregateType<T>>

    /**
     * Group by RuedaSolicitud.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedaSolicitudGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RuedaSolicitudGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuedaSolicitudGroupByArgs['orderBy'] }
        : { orderBy?: RuedaSolicitudGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RuedaSolicitudGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuedaSolicitudGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RuedaSolicitud model
   */
  readonly fields: RuedaSolicitudFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RuedaSolicitud.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuedaSolicitudClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ruedasFinal<T extends RuedaSolicitud$ruedasFinalArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitud$ruedasFinalArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    rondaServicio<T extends RuedaSolicitud$rondaServicioArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitud$rondaServicioArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    tornoG<T extends RuedaSolicitud$tornoGArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitud$tornoGArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    incidentes<T extends RuedaSolicitud$incidentesArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitud$incidentesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RuedaSolicitud model
   */
  interface RuedaSolicitudFieldRefs {
    readonly id: FieldRef<"RuedaSolicitud", 'Int'>
    readonly movimientoId: FieldRef<"RuedaSolicitud", 'Int'>
    readonly l1: FieldRef<"RuedaSolicitud", 'String'>
    readonly l2: FieldRef<"RuedaSolicitud", 'String'>
    readonly l3: FieldRef<"RuedaSolicitud", 'String'>
    readonly l4: FieldRef<"RuedaSolicitud", 'String'>
    readonly l5: FieldRef<"RuedaSolicitud", 'String'>
    readonly l6: FieldRef<"RuedaSolicitud", 'String'>
    readonly r1: FieldRef<"RuedaSolicitud", 'String'>
    readonly r2: FieldRef<"RuedaSolicitud", 'String'>
    readonly r3: FieldRef<"RuedaSolicitud", 'String'>
    readonly r4: FieldRef<"RuedaSolicitud", 'String'>
    readonly r5: FieldRef<"RuedaSolicitud", 'String'>
    readonly r6: FieldRef<"RuedaSolicitud", 'String'>
    readonly createdAt: FieldRef<"RuedaSolicitud", 'DateTime'>
    readonly updatedAt: FieldRef<"RuedaSolicitud", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RuedaSolicitud findUnique
   */
  export type RuedaSolicitudFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter, which RuedaSolicitud to fetch.
     */
    where: RuedaSolicitudWhereUniqueInput
  }

  /**
   * RuedaSolicitud findUniqueOrThrow
   */
  export type RuedaSolicitudFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter, which RuedaSolicitud to fetch.
     */
    where: RuedaSolicitudWhereUniqueInput
  }

  /**
   * RuedaSolicitud findFirst
   */
  export type RuedaSolicitudFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter, which RuedaSolicitud to fetch.
     */
    where?: RuedaSolicitudWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedaSolicituds to fetch.
     */
    orderBy?: RuedaSolicitudOrderByWithRelationInput | RuedaSolicitudOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuedaSolicituds.
     */
    cursor?: RuedaSolicitudWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedaSolicituds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedaSolicituds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuedaSolicituds.
     */
    distinct?: RuedaSolicitudScalarFieldEnum | RuedaSolicitudScalarFieldEnum[]
  }

  /**
   * RuedaSolicitud findFirstOrThrow
   */
  export type RuedaSolicitudFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter, which RuedaSolicitud to fetch.
     */
    where?: RuedaSolicitudWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedaSolicituds to fetch.
     */
    orderBy?: RuedaSolicitudOrderByWithRelationInput | RuedaSolicitudOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuedaSolicituds.
     */
    cursor?: RuedaSolicitudWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedaSolicituds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedaSolicituds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuedaSolicituds.
     */
    distinct?: RuedaSolicitudScalarFieldEnum | RuedaSolicitudScalarFieldEnum[]
  }

  /**
   * RuedaSolicitud findMany
   */
  export type RuedaSolicitudFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter, which RuedaSolicituds to fetch.
     */
    where?: RuedaSolicitudWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedaSolicituds to fetch.
     */
    orderBy?: RuedaSolicitudOrderByWithRelationInput | RuedaSolicitudOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RuedaSolicituds.
     */
    cursor?: RuedaSolicitudWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedaSolicituds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedaSolicituds.
     */
    skip?: number
    distinct?: RuedaSolicitudScalarFieldEnum | RuedaSolicitudScalarFieldEnum[]
  }

  /**
   * RuedaSolicitud create
   */
  export type RuedaSolicitudCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * The data needed to create a RuedaSolicitud.
     */
    data: XOR<RuedaSolicitudCreateInput, RuedaSolicitudUncheckedCreateInput>
  }

  /**
   * RuedaSolicitud createMany
   */
  export type RuedaSolicitudCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RuedaSolicituds.
     */
    data: RuedaSolicitudCreateManyInput | RuedaSolicitudCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RuedaSolicitud createManyAndReturn
   */
  export type RuedaSolicitudCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * The data used to create many RuedaSolicituds.
     */
    data: RuedaSolicitudCreateManyInput | RuedaSolicitudCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RuedaSolicitud update
   */
  export type RuedaSolicitudUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * The data needed to update a RuedaSolicitud.
     */
    data: XOR<RuedaSolicitudUpdateInput, RuedaSolicitudUncheckedUpdateInput>
    /**
     * Choose, which RuedaSolicitud to update.
     */
    where: RuedaSolicitudWhereUniqueInput
  }

  /**
   * RuedaSolicitud updateMany
   */
  export type RuedaSolicitudUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RuedaSolicituds.
     */
    data: XOR<RuedaSolicitudUpdateManyMutationInput, RuedaSolicitudUncheckedUpdateManyInput>
    /**
     * Filter which RuedaSolicituds to update
     */
    where?: RuedaSolicitudWhereInput
    /**
     * Limit how many RuedaSolicituds to update.
     */
    limit?: number
  }

  /**
   * RuedaSolicitud updateManyAndReturn
   */
  export type RuedaSolicitudUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * The data used to update RuedaSolicituds.
     */
    data: XOR<RuedaSolicitudUpdateManyMutationInput, RuedaSolicitudUncheckedUpdateManyInput>
    /**
     * Filter which RuedaSolicituds to update
     */
    where?: RuedaSolicitudWhereInput
    /**
     * Limit how many RuedaSolicituds to update.
     */
    limit?: number
  }

  /**
   * RuedaSolicitud upsert
   */
  export type RuedaSolicitudUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * The filter to search for the RuedaSolicitud to update in case it exists.
     */
    where: RuedaSolicitudWhereUniqueInput
    /**
     * In case the RuedaSolicitud found by the `where` argument doesn't exist, create a new RuedaSolicitud with this data.
     */
    create: XOR<RuedaSolicitudCreateInput, RuedaSolicitudUncheckedCreateInput>
    /**
     * In case the RuedaSolicitud was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuedaSolicitudUpdateInput, RuedaSolicitudUncheckedUpdateInput>
  }

  /**
   * RuedaSolicitud delete
   */
  export type RuedaSolicitudDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    /**
     * Filter which RuedaSolicitud to delete.
     */
    where: RuedaSolicitudWhereUniqueInput
  }

  /**
   * RuedaSolicitud deleteMany
   */
  export type RuedaSolicitudDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuedaSolicituds to delete
     */
    where?: RuedaSolicitudWhereInput
    /**
     * Limit how many RuedaSolicituds to delete.
     */
    limit?: number
  }

  /**
   * RuedaSolicitud.ruedasFinal
   */
  export type RuedaSolicitud$ruedasFinalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    where?: RuedasFinalWhereInput
  }

  /**
   * RuedaSolicitud.rondaServicio
   */
  export type RuedaSolicitud$rondaServicioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
  }

  /**
   * RuedaSolicitud.tornoG
   */
  export type RuedaSolicitud$tornoGArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    where?: TornoGWhereInput
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    cursor?: TornoGWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TornoGScalarFieldEnum | TornoGScalarFieldEnum[]
  }

  /**
   * RuedaSolicitud.incidentes
   */
  export type RuedaSolicitud$incidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    where?: IncidenteTornoWhereInput
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    cursor?: IncidenteTornoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: IncidenteTornoScalarFieldEnum | IncidenteTornoScalarFieldEnum[]
  }

  /**
   * RuedaSolicitud without action
   */
  export type RuedaSolicitudDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
  }


  /**
   * Model RuedasFinal
   */

  export type AggregateRuedasFinal = {
    _count: RuedasFinalCountAggregateOutputType | null
    _avg: RuedasFinalAvgAggregateOutputType | null
    _sum: RuedasFinalSumAggregateOutputType | null
    _min: RuedasFinalMinAggregateOutputType | null
    _max: RuedasFinalMaxAggregateOutputType | null
  }

  export type RuedasFinalAvgAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    torneroId: number | null
  }

  export type RuedasFinalSumAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    torneroId: number | null
  }

  export type RuedasFinalMinAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    torneroId: number | null
    l1: string | null
    l2: string | null
    l3: string | null
    l4: string | null
    l5: string | null
    l6: string | null
    r1: string | null
    r2: string | null
    r3: string | null
    r4: string | null
    r5: string | null
    r6: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuedasFinalMaxAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    torneroId: number | null
    l1: string | null
    l2: string | null
    l3: string | null
    l4: string | null
    l5: string | null
    l6: string | null
    r1: string | null
    r2: string | null
    r3: string | null
    r4: string | null
    r5: string | null
    r6: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuedasFinalCountAggregateOutputType = {
    id: number
    ruedaSolicitudId: number
    torneroId: number
    l1: number
    l2: number
    l3: number
    l4: number
    l5: number
    l6: number
    r1: number
    r2: number
    r3: number
    r4: number
    r5: number
    r6: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RuedasFinalAvgAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    torneroId?: true
  }

  export type RuedasFinalSumAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    torneroId?: true
  }

  export type RuedasFinalMinAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    torneroId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuedasFinalMaxAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    torneroId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuedasFinalCountAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    torneroId?: true
    l1?: true
    l2?: true
    l3?: true
    l4?: true
    l5?: true
    l6?: true
    r1?: true
    r2?: true
    r3?: true
    r4?: true
    r5?: true
    r6?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RuedasFinalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuedasFinal to aggregate.
     */
    where?: RuedasFinalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedasFinals to fetch.
     */
    orderBy?: RuedasFinalOrderByWithRelationInput | RuedasFinalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuedasFinalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedasFinals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedasFinals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RuedasFinals
    **/
    _count?: true | RuedasFinalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RuedasFinalAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RuedasFinalSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuedasFinalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuedasFinalMaxAggregateInputType
  }

  export type GetRuedasFinalAggregateType<T extends RuedasFinalAggregateArgs> = {
        [P in keyof T & keyof AggregateRuedasFinal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuedasFinal[P]>
      : GetScalarType<T[P], AggregateRuedasFinal[P]>
  }




  export type RuedasFinalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuedasFinalWhereInput
    orderBy?: RuedasFinalOrderByWithAggregationInput | RuedasFinalOrderByWithAggregationInput[]
    by: RuedasFinalScalarFieldEnum[] | RuedasFinalScalarFieldEnum
    having?: RuedasFinalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuedasFinalCountAggregateInputType | true
    _avg?: RuedasFinalAvgAggregateInputType
    _sum?: RuedasFinalSumAggregateInputType
    _min?: RuedasFinalMinAggregateInputType
    _max?: RuedasFinalMaxAggregateInputType
  }

  export type RuedasFinalGroupByOutputType = {
    id: number
    ruedaSolicitudId: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt: Date
    updatedAt: Date
    _count: RuedasFinalCountAggregateOutputType | null
    _avg: RuedasFinalAvgAggregateOutputType | null
    _sum: RuedasFinalSumAggregateOutputType | null
    _min: RuedasFinalMinAggregateOutputType | null
    _max: RuedasFinalMaxAggregateOutputType | null
  }

  type GetRuedasFinalGroupByPayload<T extends RuedasFinalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuedasFinalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuedasFinalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuedasFinalGroupByOutputType[P]>
            : GetScalarType<T[P], RuedasFinalGroupByOutputType[P]>
        }
      >
    >


  export type RuedasFinalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    torneroId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    rondaServicio?: boolean | RuedasFinal$rondaServicioArgs<ExtArgs>
    tornoG?: boolean | RuedasFinal$tornoGArgs<ExtArgs>
    _count?: boolean | RuedasFinalCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ruedasFinal"]>

  export type RuedasFinalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    torneroId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ruedasFinal"]>

  export type RuedasFinalSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    torneroId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ruedasFinal"]>

  export type RuedasFinalSelectScalar = {
    id?: boolean
    ruedaSolicitudId?: boolean
    torneroId?: boolean
    l1?: boolean
    l2?: boolean
    l3?: boolean
    l4?: boolean
    l5?: boolean
    l6?: boolean
    r1?: boolean
    r2?: boolean
    r3?: boolean
    r4?: boolean
    r5?: boolean
    r6?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RuedasFinalOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ruedaSolicitudId" | "torneroId" | "l1" | "l2" | "l3" | "l4" | "l5" | "l6" | "r1" | "r2" | "r3" | "r4" | "r5" | "r6" | "createdAt" | "updatedAt", ExtArgs["result"]["ruedasFinal"]>
  export type RuedasFinalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    rondaServicio?: boolean | RuedasFinal$rondaServicioArgs<ExtArgs>
    tornoG?: boolean | RuedasFinal$tornoGArgs<ExtArgs>
    _count?: boolean | RuedasFinalCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RuedasFinalIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
  }
  export type RuedasFinalIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
  }

  export type $RuedasFinalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RuedasFinal"
    objects: {
      ruedaSolicitud: Prisma.$RuedaSolicitudPayload<ExtArgs>
      rondaServicio: Prisma.$RondaServicioPayload<ExtArgs> | null
      tornoG: Prisma.$TornoGPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      ruedaSolicitudId: number
      torneroId: number
      l1: string
      l2: string
      l3: string
      l4: string
      l5: string
      l6: string
      r1: string
      r2: string
      r3: string
      r4: string
      r5: string
      r6: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["ruedasFinal"]>
    composites: {}
  }

  type RuedasFinalGetPayload<S extends boolean | null | undefined | RuedasFinalDefaultArgs> = $Result.GetResult<Prisma.$RuedasFinalPayload, S>

  type RuedasFinalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RuedasFinalFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RuedasFinalCountAggregateInputType | true
    }

  export interface RuedasFinalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RuedasFinal'], meta: { name: 'RuedasFinal' } }
    /**
     * Find zero or one RuedasFinal that matches the filter.
     * @param {RuedasFinalFindUniqueArgs} args - Arguments to find a RuedasFinal
     * @example
     * // Get one RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuedasFinalFindUniqueArgs>(args: SelectSubset<T, RuedasFinalFindUniqueArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RuedasFinal that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RuedasFinalFindUniqueOrThrowArgs} args - Arguments to find a RuedasFinal
     * @example
     * // Get one RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuedasFinalFindUniqueOrThrowArgs>(args: SelectSubset<T, RuedasFinalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RuedasFinal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalFindFirstArgs} args - Arguments to find a RuedasFinal
     * @example
     * // Get one RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuedasFinalFindFirstArgs>(args?: SelectSubset<T, RuedasFinalFindFirstArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RuedasFinal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalFindFirstOrThrowArgs} args - Arguments to find a RuedasFinal
     * @example
     * // Get one RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuedasFinalFindFirstOrThrowArgs>(args?: SelectSubset<T, RuedasFinalFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RuedasFinals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RuedasFinals
     * const ruedasFinals = await prisma.ruedasFinal.findMany()
     * 
     * // Get first 10 RuedasFinals
     * const ruedasFinals = await prisma.ruedasFinal.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ruedasFinalWithIdOnly = await prisma.ruedasFinal.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuedasFinalFindManyArgs>(args?: SelectSubset<T, RuedasFinalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RuedasFinal.
     * @param {RuedasFinalCreateArgs} args - Arguments to create a RuedasFinal.
     * @example
     * // Create one RuedasFinal
     * const RuedasFinal = await prisma.ruedasFinal.create({
     *   data: {
     *     // ... data to create a RuedasFinal
     *   }
     * })
     * 
     */
    create<T extends RuedasFinalCreateArgs>(args: SelectSubset<T, RuedasFinalCreateArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RuedasFinals.
     * @param {RuedasFinalCreateManyArgs} args - Arguments to create many RuedasFinals.
     * @example
     * // Create many RuedasFinals
     * const ruedasFinal = await prisma.ruedasFinal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuedasFinalCreateManyArgs>(args?: SelectSubset<T, RuedasFinalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RuedasFinals and returns the data saved in the database.
     * @param {RuedasFinalCreateManyAndReturnArgs} args - Arguments to create many RuedasFinals.
     * @example
     * // Create many RuedasFinals
     * const ruedasFinal = await prisma.ruedasFinal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RuedasFinals and only return the `id`
     * const ruedasFinalWithIdOnly = await prisma.ruedasFinal.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuedasFinalCreateManyAndReturnArgs>(args?: SelectSubset<T, RuedasFinalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RuedasFinal.
     * @param {RuedasFinalDeleteArgs} args - Arguments to delete one RuedasFinal.
     * @example
     * // Delete one RuedasFinal
     * const RuedasFinal = await prisma.ruedasFinal.delete({
     *   where: {
     *     // ... filter to delete one RuedasFinal
     *   }
     * })
     * 
     */
    delete<T extends RuedasFinalDeleteArgs>(args: SelectSubset<T, RuedasFinalDeleteArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RuedasFinal.
     * @param {RuedasFinalUpdateArgs} args - Arguments to update one RuedasFinal.
     * @example
     * // Update one RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuedasFinalUpdateArgs>(args: SelectSubset<T, RuedasFinalUpdateArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RuedasFinals.
     * @param {RuedasFinalDeleteManyArgs} args - Arguments to filter RuedasFinals to delete.
     * @example
     * // Delete a few RuedasFinals
     * const { count } = await prisma.ruedasFinal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuedasFinalDeleteManyArgs>(args?: SelectSubset<T, RuedasFinalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuedasFinals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RuedasFinals
     * const ruedasFinal = await prisma.ruedasFinal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuedasFinalUpdateManyArgs>(args: SelectSubset<T, RuedasFinalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuedasFinals and returns the data updated in the database.
     * @param {RuedasFinalUpdateManyAndReturnArgs} args - Arguments to update many RuedasFinals.
     * @example
     * // Update many RuedasFinals
     * const ruedasFinal = await prisma.ruedasFinal.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RuedasFinals and only return the `id`
     * const ruedasFinalWithIdOnly = await prisma.ruedasFinal.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RuedasFinalUpdateManyAndReturnArgs>(args: SelectSubset<T, RuedasFinalUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RuedasFinal.
     * @param {RuedasFinalUpsertArgs} args - Arguments to update or create a RuedasFinal.
     * @example
     * // Update or create a RuedasFinal
     * const ruedasFinal = await prisma.ruedasFinal.upsert({
     *   create: {
     *     // ... data to create a RuedasFinal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RuedasFinal we want to update
     *   }
     * })
     */
    upsert<T extends RuedasFinalUpsertArgs>(args: SelectSubset<T, RuedasFinalUpsertArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RuedasFinals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalCountArgs} args - Arguments to filter RuedasFinals to count.
     * @example
     * // Count the number of RuedasFinals
     * const count = await prisma.ruedasFinal.count({
     *   where: {
     *     // ... the filter for the RuedasFinals we want to count
     *   }
     * })
    **/
    count<T extends RuedasFinalCountArgs>(
      args?: Subset<T, RuedasFinalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuedasFinalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RuedasFinal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RuedasFinalAggregateArgs>(args: Subset<T, RuedasFinalAggregateArgs>): Prisma.PrismaPromise<GetRuedasFinalAggregateType<T>>

    /**
     * Group by RuedasFinal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuedasFinalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RuedasFinalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuedasFinalGroupByArgs['orderBy'] }
        : { orderBy?: RuedasFinalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RuedasFinalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuedasFinalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RuedasFinal model
   */
  readonly fields: RuedasFinalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RuedasFinal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuedasFinalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ruedaSolicitud<T extends RuedaSolicitudDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitudDefaultArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rondaServicio<T extends RuedasFinal$rondaServicioArgs<ExtArgs> = {}>(args?: Subset<T, RuedasFinal$rondaServicioArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    tornoG<T extends RuedasFinal$tornoGArgs<ExtArgs> = {}>(args?: Subset<T, RuedasFinal$tornoGArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RuedasFinal model
   */
  interface RuedasFinalFieldRefs {
    readonly id: FieldRef<"RuedasFinal", 'Int'>
    readonly ruedaSolicitudId: FieldRef<"RuedasFinal", 'Int'>
    readonly torneroId: FieldRef<"RuedasFinal", 'Int'>
    readonly l1: FieldRef<"RuedasFinal", 'String'>
    readonly l2: FieldRef<"RuedasFinal", 'String'>
    readonly l3: FieldRef<"RuedasFinal", 'String'>
    readonly l4: FieldRef<"RuedasFinal", 'String'>
    readonly l5: FieldRef<"RuedasFinal", 'String'>
    readonly l6: FieldRef<"RuedasFinal", 'String'>
    readonly r1: FieldRef<"RuedasFinal", 'String'>
    readonly r2: FieldRef<"RuedasFinal", 'String'>
    readonly r3: FieldRef<"RuedasFinal", 'String'>
    readonly r4: FieldRef<"RuedasFinal", 'String'>
    readonly r5: FieldRef<"RuedasFinal", 'String'>
    readonly r6: FieldRef<"RuedasFinal", 'String'>
    readonly createdAt: FieldRef<"RuedasFinal", 'DateTime'>
    readonly updatedAt: FieldRef<"RuedasFinal", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RuedasFinal findUnique
   */
  export type RuedasFinalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter, which RuedasFinal to fetch.
     */
    where: RuedasFinalWhereUniqueInput
  }

  /**
   * RuedasFinal findUniqueOrThrow
   */
  export type RuedasFinalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter, which RuedasFinal to fetch.
     */
    where: RuedasFinalWhereUniqueInput
  }

  /**
   * RuedasFinal findFirst
   */
  export type RuedasFinalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter, which RuedasFinal to fetch.
     */
    where?: RuedasFinalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedasFinals to fetch.
     */
    orderBy?: RuedasFinalOrderByWithRelationInput | RuedasFinalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuedasFinals.
     */
    cursor?: RuedasFinalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedasFinals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedasFinals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuedasFinals.
     */
    distinct?: RuedasFinalScalarFieldEnum | RuedasFinalScalarFieldEnum[]
  }

  /**
   * RuedasFinal findFirstOrThrow
   */
  export type RuedasFinalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter, which RuedasFinal to fetch.
     */
    where?: RuedasFinalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedasFinals to fetch.
     */
    orderBy?: RuedasFinalOrderByWithRelationInput | RuedasFinalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuedasFinals.
     */
    cursor?: RuedasFinalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedasFinals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedasFinals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuedasFinals.
     */
    distinct?: RuedasFinalScalarFieldEnum | RuedasFinalScalarFieldEnum[]
  }

  /**
   * RuedasFinal findMany
   */
  export type RuedasFinalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter, which RuedasFinals to fetch.
     */
    where?: RuedasFinalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuedasFinals to fetch.
     */
    orderBy?: RuedasFinalOrderByWithRelationInput | RuedasFinalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RuedasFinals.
     */
    cursor?: RuedasFinalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuedasFinals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuedasFinals.
     */
    skip?: number
    distinct?: RuedasFinalScalarFieldEnum | RuedasFinalScalarFieldEnum[]
  }

  /**
   * RuedasFinal create
   */
  export type RuedasFinalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * The data needed to create a RuedasFinal.
     */
    data: XOR<RuedasFinalCreateInput, RuedasFinalUncheckedCreateInput>
  }

  /**
   * RuedasFinal createMany
   */
  export type RuedasFinalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RuedasFinals.
     */
    data: RuedasFinalCreateManyInput | RuedasFinalCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RuedasFinal createManyAndReturn
   */
  export type RuedasFinalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * The data used to create many RuedasFinals.
     */
    data: RuedasFinalCreateManyInput | RuedasFinalCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RuedasFinal update
   */
  export type RuedasFinalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * The data needed to update a RuedasFinal.
     */
    data: XOR<RuedasFinalUpdateInput, RuedasFinalUncheckedUpdateInput>
    /**
     * Choose, which RuedasFinal to update.
     */
    where: RuedasFinalWhereUniqueInput
  }

  /**
   * RuedasFinal updateMany
   */
  export type RuedasFinalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RuedasFinals.
     */
    data: XOR<RuedasFinalUpdateManyMutationInput, RuedasFinalUncheckedUpdateManyInput>
    /**
     * Filter which RuedasFinals to update
     */
    where?: RuedasFinalWhereInput
    /**
     * Limit how many RuedasFinals to update.
     */
    limit?: number
  }

  /**
   * RuedasFinal updateManyAndReturn
   */
  export type RuedasFinalUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * The data used to update RuedasFinals.
     */
    data: XOR<RuedasFinalUpdateManyMutationInput, RuedasFinalUncheckedUpdateManyInput>
    /**
     * Filter which RuedasFinals to update
     */
    where?: RuedasFinalWhereInput
    /**
     * Limit how many RuedasFinals to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RuedasFinal upsert
   */
  export type RuedasFinalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * The filter to search for the RuedasFinal to update in case it exists.
     */
    where: RuedasFinalWhereUniqueInput
    /**
     * In case the RuedasFinal found by the `where` argument doesn't exist, create a new RuedasFinal with this data.
     */
    create: XOR<RuedasFinalCreateInput, RuedasFinalUncheckedCreateInput>
    /**
     * In case the RuedasFinal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuedasFinalUpdateInput, RuedasFinalUncheckedUpdateInput>
  }

  /**
   * RuedasFinal delete
   */
  export type RuedasFinalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    /**
     * Filter which RuedasFinal to delete.
     */
    where: RuedasFinalWhereUniqueInput
  }

  /**
   * RuedasFinal deleteMany
   */
  export type RuedasFinalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuedasFinals to delete
     */
    where?: RuedasFinalWhereInput
    /**
     * Limit how many RuedasFinals to delete.
     */
    limit?: number
  }

  /**
   * RuedasFinal.rondaServicio
   */
  export type RuedasFinal$rondaServicioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
  }

  /**
   * RuedasFinal.tornoG
   */
  export type RuedasFinal$tornoGArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    where?: TornoGWhereInput
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    cursor?: TornoGWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TornoGScalarFieldEnum | TornoGScalarFieldEnum[]
  }

  /**
   * RuedasFinal without action
   */
  export type RuedasFinalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
  }


  /**
   * Model RondaServicio
   */

  export type AggregateRondaServicio = {
    _count: RondaServicioCountAggregateOutputType | null
    _avg: RondaServicioAvgAggregateOutputType | null
    _sum: RondaServicioSumAggregateOutputType | null
    _min: RondaServicioMinAggregateOutputType | null
    _max: RondaServicioMaxAggregateOutputType | null
  }

  export type RondaServicioAvgAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    detenidoPorIncidenteId: number | null
    canceladoPorIncidenteId: number | null
  }

  export type RondaServicioSumAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    detenidoPorIncidenteId: number | null
    canceladoPorIncidenteId: number | null
  }

  export type RondaServicioMinAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    status: $Enums.EstadoRondaServicio | null
    torneroId: number | null
    inicio: Date | null
    fin: Date | null
    detenidoPorIncidenteId: number | null
    canceladoPorIncidenteId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaServicioMaxAggregateOutputType = {
    id: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    status: $Enums.EstadoRondaServicio | null
    torneroId: number | null
    inicio: Date | null
    fin: Date | null
    detenidoPorIncidenteId: number | null
    canceladoPorIncidenteId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaServicioCountAggregateOutputType = {
    id: number
    ruedaSolicitudId: number
    ruedasFinalId: number
    status: number
    torneroId: number
    inicio: number
    fin: number
    detenidoPorIncidenteId: number
    canceladoPorIncidenteId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RondaServicioAvgAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    detenidoPorIncidenteId?: true
    canceladoPorIncidenteId?: true
  }

  export type RondaServicioSumAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    detenidoPorIncidenteId?: true
    canceladoPorIncidenteId?: true
  }

  export type RondaServicioMinAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    status?: true
    torneroId?: true
    inicio?: true
    fin?: true
    detenidoPorIncidenteId?: true
    canceladoPorIncidenteId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaServicioMaxAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    status?: true
    torneroId?: true
    inicio?: true
    fin?: true
    detenidoPorIncidenteId?: true
    canceladoPorIncidenteId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaServicioCountAggregateInputType = {
    id?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    status?: true
    torneroId?: true
    inicio?: true
    fin?: true
    detenidoPorIncidenteId?: true
    canceladoPorIncidenteId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RondaServicioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaServicio to aggregate.
     */
    where?: RondaServicioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaServicios to fetch.
     */
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RondaServicioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaServicios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaServicios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RondaServicios
    **/
    _count?: true | RondaServicioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RondaServicioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RondaServicioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RondaServicioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RondaServicioMaxAggregateInputType
  }

  export type GetRondaServicioAggregateType<T extends RondaServicioAggregateArgs> = {
        [P in keyof T & keyof AggregateRondaServicio]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRondaServicio[P]>
      : GetScalarType<T[P], AggregateRondaServicio[P]>
  }




  export type RondaServicioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaServicioWhereInput
    orderBy?: RondaServicioOrderByWithAggregationInput | RondaServicioOrderByWithAggregationInput[]
    by: RondaServicioScalarFieldEnum[] | RondaServicioScalarFieldEnum
    having?: RondaServicioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RondaServicioCountAggregateInputType | true
    _avg?: RondaServicioAvgAggregateInputType
    _sum?: RondaServicioSumAggregateInputType
    _min?: RondaServicioMinAggregateInputType
    _max?: RondaServicioMaxAggregateInputType
  }

  export type RondaServicioGroupByOutputType = {
    id: number
    ruedaSolicitudId: number
    ruedasFinalId: number | null
    status: $Enums.EstadoRondaServicio
    torneroId: number | null
    inicio: Date | null
    fin: Date | null
    detenidoPorIncidenteId: number | null
    canceladoPorIncidenteId: number | null
    createdAt: Date
    updatedAt: Date
    _count: RondaServicioCountAggregateOutputType | null
    _avg: RondaServicioAvgAggregateOutputType | null
    _sum: RondaServicioSumAggregateOutputType | null
    _min: RondaServicioMinAggregateOutputType | null
    _max: RondaServicioMaxAggregateOutputType | null
  }

  type GetRondaServicioGroupByPayload<T extends RondaServicioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RondaServicioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RondaServicioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RondaServicioGroupByOutputType[P]>
            : GetScalarType<T[P], RondaServicioGroupByOutputType[P]>
        }
      >
    >


  export type RondaServicioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    status?: boolean
    torneroId?: boolean
    inicio?: boolean
    fin?: boolean
    detenidoPorIncidenteId?: boolean
    canceladoPorIncidenteId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    tornoG?: boolean | RondaServicio$tornoGArgs<ExtArgs>
    incidentes?: boolean | RondaServicio$incidentesArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
    _count?: boolean | RondaServicioCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rondaServicio"]>

  export type RondaServicioSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    status?: boolean
    torneroId?: boolean
    inicio?: boolean
    fin?: boolean
    detenidoPorIncidenteId?: boolean
    canceladoPorIncidenteId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
  }, ExtArgs["result"]["rondaServicio"]>

  export type RondaServicioSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    status?: boolean
    torneroId?: boolean
    inicio?: boolean
    fin?: boolean
    detenidoPorIncidenteId?: boolean
    canceladoPorIncidenteId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
  }, ExtArgs["result"]["rondaServicio"]>

  export type RondaServicioSelectScalar = {
    id?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    status?: boolean
    torneroId?: boolean
    inicio?: boolean
    fin?: boolean
    detenidoPorIncidenteId?: boolean
    canceladoPorIncidenteId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RondaServicioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ruedaSolicitudId" | "ruedasFinalId" | "status" | "torneroId" | "inicio" | "fin" | "detenidoPorIncidenteId" | "canceladoPorIncidenteId" | "createdAt" | "updatedAt", ExtArgs["result"]["rondaServicio"]>
  export type RondaServicioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    tornoG?: boolean | RondaServicio$tornoGArgs<ExtArgs>
    incidentes?: boolean | RondaServicio$incidentesArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
    _count?: boolean | RondaServicioCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RondaServicioIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
  }
  export type RondaServicioIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | RuedaSolicitudDefaultArgs<ExtArgs>
    ruedasFinal?: boolean | RondaServicio$ruedasFinalArgs<ExtArgs>
    detenidoPorIncidente?: boolean | RondaServicio$detenidoPorIncidenteArgs<ExtArgs>
    canceladoPorIncidente?: boolean | RondaServicio$canceladoPorIncidenteArgs<ExtArgs>
  }

  export type $RondaServicioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RondaServicio"
    objects: {
      ruedaSolicitud: Prisma.$RuedaSolicitudPayload<ExtArgs>
      ruedasFinal: Prisma.$RuedasFinalPayload<ExtArgs> | null
      tornoG: Prisma.$TornoGPayload<ExtArgs> | null
      incidentes: Prisma.$IncidenteTornoPayload<ExtArgs>[]
      detenidoPorIncidente: Prisma.$IncidenteTornoPayload<ExtArgs> | null
      canceladoPorIncidente: Prisma.$IncidenteTornoPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      ruedaSolicitudId: number
      ruedasFinalId: number | null
      status: $Enums.EstadoRondaServicio
      torneroId: number | null
      inicio: Date | null
      fin: Date | null
      detenidoPorIncidenteId: number | null
      canceladoPorIncidenteId: number | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rondaServicio"]>
    composites: {}
  }

  type RondaServicioGetPayload<S extends boolean | null | undefined | RondaServicioDefaultArgs> = $Result.GetResult<Prisma.$RondaServicioPayload, S>

  type RondaServicioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RondaServicioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RondaServicioCountAggregateInputType | true
    }

  export interface RondaServicioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RondaServicio'], meta: { name: 'RondaServicio' } }
    /**
     * Find zero or one RondaServicio that matches the filter.
     * @param {RondaServicioFindUniqueArgs} args - Arguments to find a RondaServicio
     * @example
     * // Get one RondaServicio
     * const rondaServicio = await prisma.rondaServicio.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RondaServicioFindUniqueArgs>(args: SelectSubset<T, RondaServicioFindUniqueArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RondaServicio that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RondaServicioFindUniqueOrThrowArgs} args - Arguments to find a RondaServicio
     * @example
     * // Get one RondaServicio
     * const rondaServicio = await prisma.rondaServicio.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RondaServicioFindUniqueOrThrowArgs>(args: SelectSubset<T, RondaServicioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaServicio that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioFindFirstArgs} args - Arguments to find a RondaServicio
     * @example
     * // Get one RondaServicio
     * const rondaServicio = await prisma.rondaServicio.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RondaServicioFindFirstArgs>(args?: SelectSubset<T, RondaServicioFindFirstArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaServicio that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioFindFirstOrThrowArgs} args - Arguments to find a RondaServicio
     * @example
     * // Get one RondaServicio
     * const rondaServicio = await prisma.rondaServicio.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RondaServicioFindFirstOrThrowArgs>(args?: SelectSubset<T, RondaServicioFindFirstOrThrowArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RondaServicios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RondaServicios
     * const rondaServicios = await prisma.rondaServicio.findMany()
     * 
     * // Get first 10 RondaServicios
     * const rondaServicios = await prisma.rondaServicio.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rondaServicioWithIdOnly = await prisma.rondaServicio.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RondaServicioFindManyArgs>(args?: SelectSubset<T, RondaServicioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RondaServicio.
     * @param {RondaServicioCreateArgs} args - Arguments to create a RondaServicio.
     * @example
     * // Create one RondaServicio
     * const RondaServicio = await prisma.rondaServicio.create({
     *   data: {
     *     // ... data to create a RondaServicio
     *   }
     * })
     * 
     */
    create<T extends RondaServicioCreateArgs>(args: SelectSubset<T, RondaServicioCreateArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RondaServicios.
     * @param {RondaServicioCreateManyArgs} args - Arguments to create many RondaServicios.
     * @example
     * // Create many RondaServicios
     * const rondaServicio = await prisma.rondaServicio.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RondaServicioCreateManyArgs>(args?: SelectSubset<T, RondaServicioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RondaServicios and returns the data saved in the database.
     * @param {RondaServicioCreateManyAndReturnArgs} args - Arguments to create many RondaServicios.
     * @example
     * // Create many RondaServicios
     * const rondaServicio = await prisma.rondaServicio.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RondaServicios and only return the `id`
     * const rondaServicioWithIdOnly = await prisma.rondaServicio.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RondaServicioCreateManyAndReturnArgs>(args?: SelectSubset<T, RondaServicioCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RondaServicio.
     * @param {RondaServicioDeleteArgs} args - Arguments to delete one RondaServicio.
     * @example
     * // Delete one RondaServicio
     * const RondaServicio = await prisma.rondaServicio.delete({
     *   where: {
     *     // ... filter to delete one RondaServicio
     *   }
     * })
     * 
     */
    delete<T extends RondaServicioDeleteArgs>(args: SelectSubset<T, RondaServicioDeleteArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RondaServicio.
     * @param {RondaServicioUpdateArgs} args - Arguments to update one RondaServicio.
     * @example
     * // Update one RondaServicio
     * const rondaServicio = await prisma.rondaServicio.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RondaServicioUpdateArgs>(args: SelectSubset<T, RondaServicioUpdateArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RondaServicios.
     * @param {RondaServicioDeleteManyArgs} args - Arguments to filter RondaServicios to delete.
     * @example
     * // Delete a few RondaServicios
     * const { count } = await prisma.rondaServicio.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RondaServicioDeleteManyArgs>(args?: SelectSubset<T, RondaServicioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaServicios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RondaServicios
     * const rondaServicio = await prisma.rondaServicio.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RondaServicioUpdateManyArgs>(args: SelectSubset<T, RondaServicioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaServicios and returns the data updated in the database.
     * @param {RondaServicioUpdateManyAndReturnArgs} args - Arguments to update many RondaServicios.
     * @example
     * // Update many RondaServicios
     * const rondaServicio = await prisma.rondaServicio.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RondaServicios and only return the `id`
     * const rondaServicioWithIdOnly = await prisma.rondaServicio.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RondaServicioUpdateManyAndReturnArgs>(args: SelectSubset<T, RondaServicioUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RondaServicio.
     * @param {RondaServicioUpsertArgs} args - Arguments to update or create a RondaServicio.
     * @example
     * // Update or create a RondaServicio
     * const rondaServicio = await prisma.rondaServicio.upsert({
     *   create: {
     *     // ... data to create a RondaServicio
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RondaServicio we want to update
     *   }
     * })
     */
    upsert<T extends RondaServicioUpsertArgs>(args: SelectSubset<T, RondaServicioUpsertArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RondaServicios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioCountArgs} args - Arguments to filter RondaServicios to count.
     * @example
     * // Count the number of RondaServicios
     * const count = await prisma.rondaServicio.count({
     *   where: {
     *     // ... the filter for the RondaServicios we want to count
     *   }
     * })
    **/
    count<T extends RondaServicioCountArgs>(
      args?: Subset<T, RondaServicioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RondaServicioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RondaServicio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RondaServicioAggregateArgs>(args: Subset<T, RondaServicioAggregateArgs>): Prisma.PrismaPromise<GetRondaServicioAggregateType<T>>

    /**
     * Group by RondaServicio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaServicioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RondaServicioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RondaServicioGroupByArgs['orderBy'] }
        : { orderBy?: RondaServicioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RondaServicioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRondaServicioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RondaServicio model
   */
  readonly fields: RondaServicioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RondaServicio.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RondaServicioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ruedaSolicitud<T extends RuedaSolicitudDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RuedaSolicitudDefaultArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    ruedasFinal<T extends RondaServicio$ruedasFinalArgs<ExtArgs> = {}>(args?: Subset<T, RondaServicio$ruedasFinalArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    tornoG<T extends RondaServicio$tornoGArgs<ExtArgs> = {}>(args?: Subset<T, RondaServicio$tornoGArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    incidentes<T extends RondaServicio$incidentesArgs<ExtArgs> = {}>(args?: Subset<T, RondaServicio$incidentesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    detenidoPorIncidente<T extends RondaServicio$detenidoPorIncidenteArgs<ExtArgs> = {}>(args?: Subset<T, RondaServicio$detenidoPorIncidenteArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    canceladoPorIncidente<T extends RondaServicio$canceladoPorIncidenteArgs<ExtArgs> = {}>(args?: Subset<T, RondaServicio$canceladoPorIncidenteArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RondaServicio model
   */
  interface RondaServicioFieldRefs {
    readonly id: FieldRef<"RondaServicio", 'Int'>
    readonly ruedaSolicitudId: FieldRef<"RondaServicio", 'Int'>
    readonly ruedasFinalId: FieldRef<"RondaServicio", 'Int'>
    readonly status: FieldRef<"RondaServicio", 'EstadoRondaServicio'>
    readonly torneroId: FieldRef<"RondaServicio", 'Int'>
    readonly inicio: FieldRef<"RondaServicio", 'DateTime'>
    readonly fin: FieldRef<"RondaServicio", 'DateTime'>
    readonly detenidoPorIncidenteId: FieldRef<"RondaServicio", 'Int'>
    readonly canceladoPorIncidenteId: FieldRef<"RondaServicio", 'Int'>
    readonly createdAt: FieldRef<"RondaServicio", 'DateTime'>
    readonly updatedAt: FieldRef<"RondaServicio", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RondaServicio findUnique
   */
  export type RondaServicioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter, which RondaServicio to fetch.
     */
    where: RondaServicioWhereUniqueInput
  }

  /**
   * RondaServicio findUniqueOrThrow
   */
  export type RondaServicioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter, which RondaServicio to fetch.
     */
    where: RondaServicioWhereUniqueInput
  }

  /**
   * RondaServicio findFirst
   */
  export type RondaServicioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter, which RondaServicio to fetch.
     */
    where?: RondaServicioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaServicios to fetch.
     */
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaServicios.
     */
    cursor?: RondaServicioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaServicios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaServicios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaServicios.
     */
    distinct?: RondaServicioScalarFieldEnum | RondaServicioScalarFieldEnum[]
  }

  /**
   * RondaServicio findFirstOrThrow
   */
  export type RondaServicioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter, which RondaServicio to fetch.
     */
    where?: RondaServicioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaServicios to fetch.
     */
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaServicios.
     */
    cursor?: RondaServicioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaServicios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaServicios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaServicios.
     */
    distinct?: RondaServicioScalarFieldEnum | RondaServicioScalarFieldEnum[]
  }

  /**
   * RondaServicio findMany
   */
  export type RondaServicioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter, which RondaServicios to fetch.
     */
    where?: RondaServicioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaServicios to fetch.
     */
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RondaServicios.
     */
    cursor?: RondaServicioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaServicios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaServicios.
     */
    skip?: number
    distinct?: RondaServicioScalarFieldEnum | RondaServicioScalarFieldEnum[]
  }

  /**
   * RondaServicio create
   */
  export type RondaServicioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * The data needed to create a RondaServicio.
     */
    data: XOR<RondaServicioCreateInput, RondaServicioUncheckedCreateInput>
  }

  /**
   * RondaServicio createMany
   */
  export type RondaServicioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RondaServicios.
     */
    data: RondaServicioCreateManyInput | RondaServicioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RondaServicio createManyAndReturn
   */
  export type RondaServicioCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * The data used to create many RondaServicios.
     */
    data: RondaServicioCreateManyInput | RondaServicioCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RondaServicio update
   */
  export type RondaServicioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * The data needed to update a RondaServicio.
     */
    data: XOR<RondaServicioUpdateInput, RondaServicioUncheckedUpdateInput>
    /**
     * Choose, which RondaServicio to update.
     */
    where: RondaServicioWhereUniqueInput
  }

  /**
   * RondaServicio updateMany
   */
  export type RondaServicioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RondaServicios.
     */
    data: XOR<RondaServicioUpdateManyMutationInput, RondaServicioUncheckedUpdateManyInput>
    /**
     * Filter which RondaServicios to update
     */
    where?: RondaServicioWhereInput
    /**
     * Limit how many RondaServicios to update.
     */
    limit?: number
  }

  /**
   * RondaServicio updateManyAndReturn
   */
  export type RondaServicioUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * The data used to update RondaServicios.
     */
    data: XOR<RondaServicioUpdateManyMutationInput, RondaServicioUncheckedUpdateManyInput>
    /**
     * Filter which RondaServicios to update
     */
    where?: RondaServicioWhereInput
    /**
     * Limit how many RondaServicios to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RondaServicio upsert
   */
  export type RondaServicioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * The filter to search for the RondaServicio to update in case it exists.
     */
    where: RondaServicioWhereUniqueInput
    /**
     * In case the RondaServicio found by the `where` argument doesn't exist, create a new RondaServicio with this data.
     */
    create: XOR<RondaServicioCreateInput, RondaServicioUncheckedCreateInput>
    /**
     * In case the RondaServicio was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RondaServicioUpdateInput, RondaServicioUncheckedUpdateInput>
  }

  /**
   * RondaServicio delete
   */
  export type RondaServicioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    /**
     * Filter which RondaServicio to delete.
     */
    where: RondaServicioWhereUniqueInput
  }

  /**
   * RondaServicio deleteMany
   */
  export type RondaServicioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaServicios to delete
     */
    where?: RondaServicioWhereInput
    /**
     * Limit how many RondaServicios to delete.
     */
    limit?: number
  }

  /**
   * RondaServicio.ruedasFinal
   */
  export type RondaServicio$ruedasFinalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    where?: RuedasFinalWhereInput
  }

  /**
   * RondaServicio.tornoG
   */
  export type RondaServicio$tornoGArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    where?: TornoGWhereInput
  }

  /**
   * RondaServicio.incidentes
   */
  export type RondaServicio$incidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    where?: IncidenteTornoWhereInput
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    cursor?: IncidenteTornoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: IncidenteTornoScalarFieldEnum | IncidenteTornoScalarFieldEnum[]
  }

  /**
   * RondaServicio.detenidoPorIncidente
   */
  export type RondaServicio$detenidoPorIncidenteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    where?: IncidenteTornoWhereInput
  }

  /**
   * RondaServicio.canceladoPorIncidente
   */
  export type RondaServicio$canceladoPorIncidenteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    where?: IncidenteTornoWhereInput
  }

  /**
   * RondaServicio without action
   */
  export type RondaServicioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
  }


  /**
   * Model Nava
   */

  export type AggregateNava = {
    _count: NavaCountAggregateOutputType | null
    _avg: NavaAvgAggregateOutputType | null
    _sum: NavaSumAggregateOutputType | null
    _min: NavaMinAggregateOutputType | null
    _max: NavaMaxAggregateOutputType | null
  }

  export type NavaAvgAggregateOutputType = {
    id: number | null
    localidadId: number | null
    cantidad: number | null
  }

  export type NavaSumAggregateOutputType = {
    id: number | null
    localidadId: number | null
    cantidad: number | null
  }

  export type NavaMinAggregateOutputType = {
    id: number | null
    localidadId: number | null
    cantidad: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type NavaMaxAggregateOutputType = {
    id: number | null
    localidadId: number | null
    cantidad: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type NavaCountAggregateOutputType = {
    id: number
    localidadId: number
    cantidad: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type NavaAvgAggregateInputType = {
    id?: true
    localidadId?: true
    cantidad?: true
  }

  export type NavaSumAggregateInputType = {
    id?: true
    localidadId?: true
    cantidad?: true
  }

  export type NavaMinAggregateInputType = {
    id?: true
    localidadId?: true
    cantidad?: true
    createdAt?: true
    updatedAt?: true
  }

  export type NavaMaxAggregateInputType = {
    id?: true
    localidadId?: true
    cantidad?: true
    createdAt?: true
    updatedAt?: true
  }

  export type NavaCountAggregateInputType = {
    id?: true
    localidadId?: true
    cantidad?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type NavaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nava to aggregate.
     */
    where?: NavaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Navas to fetch.
     */
    orderBy?: NavaOrderByWithRelationInput | NavaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: NavaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Navas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Navas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Navas
    **/
    _count?: true | NavaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: NavaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: NavaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: NavaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: NavaMaxAggregateInputType
  }

  export type GetNavaAggregateType<T extends NavaAggregateArgs> = {
        [P in keyof T & keyof AggregateNava]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNava[P]>
      : GetScalarType<T[P], AggregateNava[P]>
  }




  export type NavaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: NavaWhereInput
    orderBy?: NavaOrderByWithAggregationInput | NavaOrderByWithAggregationInput[]
    by: NavaScalarFieldEnum[] | NavaScalarFieldEnum
    having?: NavaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: NavaCountAggregateInputType | true
    _avg?: NavaAvgAggregateInputType
    _sum?: NavaSumAggregateInputType
    _min?: NavaMinAggregateInputType
    _max?: NavaMaxAggregateInputType
  }

  export type NavaGroupByOutputType = {
    id: number
    localidadId: number
    cantidad: number
    createdAt: Date
    updatedAt: Date
    _count: NavaCountAggregateOutputType | null
    _avg: NavaAvgAggregateOutputType | null
    _sum: NavaSumAggregateOutputType | null
    _min: NavaMinAggregateOutputType | null
    _max: NavaMaxAggregateOutputType | null
  }

  type GetNavaGroupByPayload<T extends NavaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<NavaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof NavaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], NavaGroupByOutputType[P]>
            : GetScalarType<T[P], NavaGroupByOutputType[P]>
        }
      >
    >


  export type NavaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    cantidad?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cambios?: boolean | Nava$cambiosArgs<ExtArgs>
    _count?: boolean | NavaCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nava"]>

  export type NavaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    cantidad?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["nava"]>

  export type NavaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    cantidad?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["nava"]>

  export type NavaSelectScalar = {
    id?: boolean
    localidadId?: boolean
    cantidad?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type NavaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "localidadId" | "cantidad" | "createdAt" | "updatedAt", ExtArgs["result"]["nava"]>
  export type NavaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cambios?: boolean | Nava$cambiosArgs<ExtArgs>
    _count?: boolean | NavaCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type NavaIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type NavaIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $NavaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nava"
    objects: {
      cambios: Prisma.$CambioPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      localidadId: number
      cantidad: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["nava"]>
    composites: {}
  }

  type NavaGetPayload<S extends boolean | null | undefined | NavaDefaultArgs> = $Result.GetResult<Prisma.$NavaPayload, S>

  type NavaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<NavaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: NavaCountAggregateInputType | true
    }

  export interface NavaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nava'], meta: { name: 'Nava' } }
    /**
     * Find zero or one Nava that matches the filter.
     * @param {NavaFindUniqueArgs} args - Arguments to find a Nava
     * @example
     * // Get one Nava
     * const nava = await prisma.nava.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends NavaFindUniqueArgs>(args: SelectSubset<T, NavaFindUniqueArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nava that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {NavaFindUniqueOrThrowArgs} args - Arguments to find a Nava
     * @example
     * // Get one Nava
     * const nava = await prisma.nava.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends NavaFindUniqueOrThrowArgs>(args: SelectSubset<T, NavaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nava that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaFindFirstArgs} args - Arguments to find a Nava
     * @example
     * // Get one Nava
     * const nava = await prisma.nava.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends NavaFindFirstArgs>(args?: SelectSubset<T, NavaFindFirstArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nava that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaFindFirstOrThrowArgs} args - Arguments to find a Nava
     * @example
     * // Get one Nava
     * const nava = await prisma.nava.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends NavaFindFirstOrThrowArgs>(args?: SelectSubset<T, NavaFindFirstOrThrowArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Navas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Navas
     * const navas = await prisma.nava.findMany()
     * 
     * // Get first 10 Navas
     * const navas = await prisma.nava.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const navaWithIdOnly = await prisma.nava.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends NavaFindManyArgs>(args?: SelectSubset<T, NavaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nava.
     * @param {NavaCreateArgs} args - Arguments to create a Nava.
     * @example
     * // Create one Nava
     * const Nava = await prisma.nava.create({
     *   data: {
     *     // ... data to create a Nava
     *   }
     * })
     * 
     */
    create<T extends NavaCreateArgs>(args: SelectSubset<T, NavaCreateArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Navas.
     * @param {NavaCreateManyArgs} args - Arguments to create many Navas.
     * @example
     * // Create many Navas
     * const nava = await prisma.nava.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends NavaCreateManyArgs>(args?: SelectSubset<T, NavaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Navas and returns the data saved in the database.
     * @param {NavaCreateManyAndReturnArgs} args - Arguments to create many Navas.
     * @example
     * // Create many Navas
     * const nava = await prisma.nava.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Navas and only return the `id`
     * const navaWithIdOnly = await prisma.nava.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends NavaCreateManyAndReturnArgs>(args?: SelectSubset<T, NavaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nava.
     * @param {NavaDeleteArgs} args - Arguments to delete one Nava.
     * @example
     * // Delete one Nava
     * const Nava = await prisma.nava.delete({
     *   where: {
     *     // ... filter to delete one Nava
     *   }
     * })
     * 
     */
    delete<T extends NavaDeleteArgs>(args: SelectSubset<T, NavaDeleteArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nava.
     * @param {NavaUpdateArgs} args - Arguments to update one Nava.
     * @example
     * // Update one Nava
     * const nava = await prisma.nava.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends NavaUpdateArgs>(args: SelectSubset<T, NavaUpdateArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Navas.
     * @param {NavaDeleteManyArgs} args - Arguments to filter Navas to delete.
     * @example
     * // Delete a few Navas
     * const { count } = await prisma.nava.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends NavaDeleteManyArgs>(args?: SelectSubset<T, NavaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Navas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Navas
     * const nava = await prisma.nava.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends NavaUpdateManyArgs>(args: SelectSubset<T, NavaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Navas and returns the data updated in the database.
     * @param {NavaUpdateManyAndReturnArgs} args - Arguments to update many Navas.
     * @example
     * // Update many Navas
     * const nava = await prisma.nava.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Navas and only return the `id`
     * const navaWithIdOnly = await prisma.nava.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends NavaUpdateManyAndReturnArgs>(args: SelectSubset<T, NavaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nava.
     * @param {NavaUpsertArgs} args - Arguments to update or create a Nava.
     * @example
     * // Update or create a Nava
     * const nava = await prisma.nava.upsert({
     *   create: {
     *     // ... data to create a Nava
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nava we want to update
     *   }
     * })
     */
    upsert<T extends NavaUpsertArgs>(args: SelectSubset<T, NavaUpsertArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Navas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaCountArgs} args - Arguments to filter Navas to count.
     * @example
     * // Count the number of Navas
     * const count = await prisma.nava.count({
     *   where: {
     *     // ... the filter for the Navas we want to count
     *   }
     * })
    **/
    count<T extends NavaCountArgs>(
      args?: Subset<T, NavaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], NavaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nava.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends NavaAggregateArgs>(args: Subset<T, NavaAggregateArgs>): Prisma.PrismaPromise<GetNavaAggregateType<T>>

    /**
     * Group by Nava.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NavaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends NavaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: NavaGroupByArgs['orderBy'] }
        : { orderBy?: NavaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, NavaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNavaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nava model
   */
  readonly fields: NavaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nava.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__NavaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cambios<T extends Nava$cambiosArgs<ExtArgs> = {}>(args?: Subset<T, Nava$cambiosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nava model
   */
  interface NavaFieldRefs {
    readonly id: FieldRef<"Nava", 'Int'>
    readonly localidadId: FieldRef<"Nava", 'Int'>
    readonly cantidad: FieldRef<"Nava", 'Int'>
    readonly createdAt: FieldRef<"Nava", 'DateTime'>
    readonly updatedAt: FieldRef<"Nava", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Nava findUnique
   */
  export type NavaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter, which Nava to fetch.
     */
    where: NavaWhereUniqueInput
  }

  /**
   * Nava findUniqueOrThrow
   */
  export type NavaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter, which Nava to fetch.
     */
    where: NavaWhereUniqueInput
  }

  /**
   * Nava findFirst
   */
  export type NavaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter, which Nava to fetch.
     */
    where?: NavaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Navas to fetch.
     */
    orderBy?: NavaOrderByWithRelationInput | NavaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Navas.
     */
    cursor?: NavaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Navas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Navas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Navas.
     */
    distinct?: NavaScalarFieldEnum | NavaScalarFieldEnum[]
  }

  /**
   * Nava findFirstOrThrow
   */
  export type NavaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter, which Nava to fetch.
     */
    where?: NavaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Navas to fetch.
     */
    orderBy?: NavaOrderByWithRelationInput | NavaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Navas.
     */
    cursor?: NavaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Navas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Navas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Navas.
     */
    distinct?: NavaScalarFieldEnum | NavaScalarFieldEnum[]
  }

  /**
   * Nava findMany
   */
  export type NavaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter, which Navas to fetch.
     */
    where?: NavaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Navas to fetch.
     */
    orderBy?: NavaOrderByWithRelationInput | NavaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Navas.
     */
    cursor?: NavaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Navas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Navas.
     */
    skip?: number
    distinct?: NavaScalarFieldEnum | NavaScalarFieldEnum[]
  }

  /**
   * Nava create
   */
  export type NavaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * The data needed to create a Nava.
     */
    data: XOR<NavaCreateInput, NavaUncheckedCreateInput>
  }

  /**
   * Nava createMany
   */
  export type NavaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Navas.
     */
    data: NavaCreateManyInput | NavaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nava createManyAndReturn
   */
  export type NavaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * The data used to create many Navas.
     */
    data: NavaCreateManyInput | NavaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nava update
   */
  export type NavaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * The data needed to update a Nava.
     */
    data: XOR<NavaUpdateInput, NavaUncheckedUpdateInput>
    /**
     * Choose, which Nava to update.
     */
    where: NavaWhereUniqueInput
  }

  /**
   * Nava updateMany
   */
  export type NavaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Navas.
     */
    data: XOR<NavaUpdateManyMutationInput, NavaUncheckedUpdateManyInput>
    /**
     * Filter which Navas to update
     */
    where?: NavaWhereInput
    /**
     * Limit how many Navas to update.
     */
    limit?: number
  }

  /**
   * Nava updateManyAndReturn
   */
  export type NavaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * The data used to update Navas.
     */
    data: XOR<NavaUpdateManyMutationInput, NavaUncheckedUpdateManyInput>
    /**
     * Filter which Navas to update
     */
    where?: NavaWhereInput
    /**
     * Limit how many Navas to update.
     */
    limit?: number
  }

  /**
   * Nava upsert
   */
  export type NavaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * The filter to search for the Nava to update in case it exists.
     */
    where: NavaWhereUniqueInput
    /**
     * In case the Nava found by the `where` argument doesn't exist, create a new Nava with this data.
     */
    create: XOR<NavaCreateInput, NavaUncheckedCreateInput>
    /**
     * In case the Nava was found with the provided `where` argument, update it with this data.
     */
    update: XOR<NavaUpdateInput, NavaUncheckedUpdateInput>
  }

  /**
   * Nava delete
   */
  export type NavaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
    /**
     * Filter which Nava to delete.
     */
    where: NavaWhereUniqueInput
  }

  /**
   * Nava deleteMany
   */
  export type NavaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Navas to delete
     */
    where?: NavaWhereInput
    /**
     * Limit how many Navas to delete.
     */
    limit?: number
  }

  /**
   * Nava.cambios
   */
  export type Nava$cambiosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    where?: CambioWhereInput
    orderBy?: CambioOrderByWithRelationInput | CambioOrderByWithRelationInput[]
    cursor?: CambioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CambioScalarFieldEnum | CambioScalarFieldEnum[]
  }

  /**
   * Nava without action
   */
  export type NavaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nava
     */
    select?: NavaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nava
     */
    omit?: NavaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NavaInclude<ExtArgs> | null
  }


  /**
   * Model Cambio
   */

  export type AggregateCambio = {
    _count: CambioCountAggregateOutputType | null
    _avg: CambioAvgAggregateOutputType | null
    _sum: CambioSumAggregateOutputType | null
    _min: CambioMinAggregateOutputType | null
    _max: CambioMaxAggregateOutputType | null
  }

  export type CambioAvgAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroNavaja: number | null
  }

  export type CambioSumAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroNavaja: number | null
  }

  export type CambioMinAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroNavaja: number | null
    createdAt: Date | null
  }

  export type CambioMaxAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroNavaja: number | null
    createdAt: Date | null
  }

  export type CambioCountAggregateOutputType = {
    id: number
    localidadId: number
    numeroNavaja: number
    createdAt: number
    _all: number
  }


  export type CambioAvgAggregateInputType = {
    id?: true
    localidadId?: true
    numeroNavaja?: true
  }

  export type CambioSumAggregateInputType = {
    id?: true
    localidadId?: true
    numeroNavaja?: true
  }

  export type CambioMinAggregateInputType = {
    id?: true
    localidadId?: true
    numeroNavaja?: true
    createdAt?: true
  }

  export type CambioMaxAggregateInputType = {
    id?: true
    localidadId?: true
    numeroNavaja?: true
    createdAt?: true
  }

  export type CambioCountAggregateInputType = {
    id?: true
    localidadId?: true
    numeroNavaja?: true
    createdAt?: true
    _all?: true
  }

  export type CambioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cambio to aggregate.
     */
    where?: CambioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cambios to fetch.
     */
    orderBy?: CambioOrderByWithRelationInput | CambioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CambioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cambios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cambios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Cambios
    **/
    _count?: true | CambioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CambioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CambioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CambioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CambioMaxAggregateInputType
  }

  export type GetCambioAggregateType<T extends CambioAggregateArgs> = {
        [P in keyof T & keyof AggregateCambio]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCambio[P]>
      : GetScalarType<T[P], AggregateCambio[P]>
  }




  export type CambioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CambioWhereInput
    orderBy?: CambioOrderByWithAggregationInput | CambioOrderByWithAggregationInput[]
    by: CambioScalarFieldEnum[] | CambioScalarFieldEnum
    having?: CambioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CambioCountAggregateInputType | true
    _avg?: CambioAvgAggregateInputType
    _sum?: CambioSumAggregateInputType
    _min?: CambioMinAggregateInputType
    _max?: CambioMaxAggregateInputType
  }

  export type CambioGroupByOutputType = {
    id: number
    localidadId: number
    numeroNavaja: number
    createdAt: Date
    _count: CambioCountAggregateOutputType | null
    _avg: CambioAvgAggregateOutputType | null
    _sum: CambioSumAggregateOutputType | null
    _min: CambioMinAggregateOutputType | null
    _max: CambioMaxAggregateOutputType | null
  }

  type GetCambioGroupByPayload<T extends CambioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CambioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CambioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CambioGroupByOutputType[P]>
            : GetScalarType<T[P], CambioGroupByOutputType[P]>
        }
      >
    >


  export type CambioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroNavaja?: boolean
    createdAt?: boolean
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cambio"]>

  export type CambioSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroNavaja?: boolean
    createdAt?: boolean
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cambio"]>

  export type CambioSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroNavaja?: boolean
    createdAt?: boolean
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cambio"]>

  export type CambioSelectScalar = {
    id?: boolean
    localidadId?: boolean
    numeroNavaja?: boolean
    createdAt?: boolean
  }

  export type CambioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "localidadId" | "numeroNavaja" | "createdAt", ExtArgs["result"]["cambio"]>
  export type CambioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }
  export type CambioIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }
  export type CambioIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    nava?: boolean | NavaDefaultArgs<ExtArgs>
  }

  export type $CambioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Cambio"
    objects: {
      nava: Prisma.$NavaPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      localidadId: number
      numeroNavaja: number
      createdAt: Date
    }, ExtArgs["result"]["cambio"]>
    composites: {}
  }

  type CambioGetPayload<S extends boolean | null | undefined | CambioDefaultArgs> = $Result.GetResult<Prisma.$CambioPayload, S>

  type CambioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CambioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CambioCountAggregateInputType | true
    }

  export interface CambioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Cambio'], meta: { name: 'Cambio' } }
    /**
     * Find zero or one Cambio that matches the filter.
     * @param {CambioFindUniqueArgs} args - Arguments to find a Cambio
     * @example
     * // Get one Cambio
     * const cambio = await prisma.cambio.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CambioFindUniqueArgs>(args: SelectSubset<T, CambioFindUniqueArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cambio that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CambioFindUniqueOrThrowArgs} args - Arguments to find a Cambio
     * @example
     * // Get one Cambio
     * const cambio = await prisma.cambio.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CambioFindUniqueOrThrowArgs>(args: SelectSubset<T, CambioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cambio that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioFindFirstArgs} args - Arguments to find a Cambio
     * @example
     * // Get one Cambio
     * const cambio = await prisma.cambio.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CambioFindFirstArgs>(args?: SelectSubset<T, CambioFindFirstArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cambio that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioFindFirstOrThrowArgs} args - Arguments to find a Cambio
     * @example
     * // Get one Cambio
     * const cambio = await prisma.cambio.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CambioFindFirstOrThrowArgs>(args?: SelectSubset<T, CambioFindFirstOrThrowArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Cambios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Cambios
     * const cambios = await prisma.cambio.findMany()
     * 
     * // Get first 10 Cambios
     * const cambios = await prisma.cambio.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cambioWithIdOnly = await prisma.cambio.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CambioFindManyArgs>(args?: SelectSubset<T, CambioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cambio.
     * @param {CambioCreateArgs} args - Arguments to create a Cambio.
     * @example
     * // Create one Cambio
     * const Cambio = await prisma.cambio.create({
     *   data: {
     *     // ... data to create a Cambio
     *   }
     * })
     * 
     */
    create<T extends CambioCreateArgs>(args: SelectSubset<T, CambioCreateArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Cambios.
     * @param {CambioCreateManyArgs} args - Arguments to create many Cambios.
     * @example
     * // Create many Cambios
     * const cambio = await prisma.cambio.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CambioCreateManyArgs>(args?: SelectSubset<T, CambioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Cambios and returns the data saved in the database.
     * @param {CambioCreateManyAndReturnArgs} args - Arguments to create many Cambios.
     * @example
     * // Create many Cambios
     * const cambio = await prisma.cambio.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Cambios and only return the `id`
     * const cambioWithIdOnly = await prisma.cambio.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CambioCreateManyAndReturnArgs>(args?: SelectSubset<T, CambioCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Cambio.
     * @param {CambioDeleteArgs} args - Arguments to delete one Cambio.
     * @example
     * // Delete one Cambio
     * const Cambio = await prisma.cambio.delete({
     *   where: {
     *     // ... filter to delete one Cambio
     *   }
     * })
     * 
     */
    delete<T extends CambioDeleteArgs>(args: SelectSubset<T, CambioDeleteArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cambio.
     * @param {CambioUpdateArgs} args - Arguments to update one Cambio.
     * @example
     * // Update one Cambio
     * const cambio = await prisma.cambio.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CambioUpdateArgs>(args: SelectSubset<T, CambioUpdateArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Cambios.
     * @param {CambioDeleteManyArgs} args - Arguments to filter Cambios to delete.
     * @example
     * // Delete a few Cambios
     * const { count } = await prisma.cambio.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CambioDeleteManyArgs>(args?: SelectSubset<T, CambioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cambios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Cambios
     * const cambio = await prisma.cambio.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CambioUpdateManyArgs>(args: SelectSubset<T, CambioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cambios and returns the data updated in the database.
     * @param {CambioUpdateManyAndReturnArgs} args - Arguments to update many Cambios.
     * @example
     * // Update many Cambios
     * const cambio = await prisma.cambio.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Cambios and only return the `id`
     * const cambioWithIdOnly = await prisma.cambio.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CambioUpdateManyAndReturnArgs>(args: SelectSubset<T, CambioUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Cambio.
     * @param {CambioUpsertArgs} args - Arguments to update or create a Cambio.
     * @example
     * // Update or create a Cambio
     * const cambio = await prisma.cambio.upsert({
     *   create: {
     *     // ... data to create a Cambio
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cambio we want to update
     *   }
     * })
     */
    upsert<T extends CambioUpsertArgs>(args: SelectSubset<T, CambioUpsertArgs<ExtArgs>>): Prisma__CambioClient<$Result.GetResult<Prisma.$CambioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Cambios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioCountArgs} args - Arguments to filter Cambios to count.
     * @example
     * // Count the number of Cambios
     * const count = await prisma.cambio.count({
     *   where: {
     *     // ... the filter for the Cambios we want to count
     *   }
     * })
    **/
    count<T extends CambioCountArgs>(
      args?: Subset<T, CambioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CambioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cambio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CambioAggregateArgs>(args: Subset<T, CambioAggregateArgs>): Prisma.PrismaPromise<GetCambioAggregateType<T>>

    /**
     * Group by Cambio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CambioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CambioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CambioGroupByArgs['orderBy'] }
        : { orderBy?: CambioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CambioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCambioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Cambio model
   */
  readonly fields: CambioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Cambio.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CambioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    nava<T extends NavaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, NavaDefaultArgs<ExtArgs>>): Prisma__NavaClient<$Result.GetResult<Prisma.$NavaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Cambio model
   */
  interface CambioFieldRefs {
    readonly id: FieldRef<"Cambio", 'Int'>
    readonly localidadId: FieldRef<"Cambio", 'Int'>
    readonly numeroNavaja: FieldRef<"Cambio", 'Int'>
    readonly createdAt: FieldRef<"Cambio", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Cambio findUnique
   */
  export type CambioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter, which Cambio to fetch.
     */
    where: CambioWhereUniqueInput
  }

  /**
   * Cambio findUniqueOrThrow
   */
  export type CambioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter, which Cambio to fetch.
     */
    where: CambioWhereUniqueInput
  }

  /**
   * Cambio findFirst
   */
  export type CambioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter, which Cambio to fetch.
     */
    where?: CambioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cambios to fetch.
     */
    orderBy?: CambioOrderByWithRelationInput | CambioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Cambios.
     */
    cursor?: CambioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cambios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cambios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Cambios.
     */
    distinct?: CambioScalarFieldEnum | CambioScalarFieldEnum[]
  }

  /**
   * Cambio findFirstOrThrow
   */
  export type CambioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter, which Cambio to fetch.
     */
    where?: CambioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cambios to fetch.
     */
    orderBy?: CambioOrderByWithRelationInput | CambioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Cambios.
     */
    cursor?: CambioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cambios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cambios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Cambios.
     */
    distinct?: CambioScalarFieldEnum | CambioScalarFieldEnum[]
  }

  /**
   * Cambio findMany
   */
  export type CambioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter, which Cambios to fetch.
     */
    where?: CambioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cambios to fetch.
     */
    orderBy?: CambioOrderByWithRelationInput | CambioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Cambios.
     */
    cursor?: CambioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cambios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cambios.
     */
    skip?: number
    distinct?: CambioScalarFieldEnum | CambioScalarFieldEnum[]
  }

  /**
   * Cambio create
   */
  export type CambioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * The data needed to create a Cambio.
     */
    data: XOR<CambioCreateInput, CambioUncheckedCreateInput>
  }

  /**
   * Cambio createMany
   */
  export type CambioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Cambios.
     */
    data: CambioCreateManyInput | CambioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cambio createManyAndReturn
   */
  export type CambioCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * The data used to create many Cambios.
     */
    data: CambioCreateManyInput | CambioCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Cambio update
   */
  export type CambioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * The data needed to update a Cambio.
     */
    data: XOR<CambioUpdateInput, CambioUncheckedUpdateInput>
    /**
     * Choose, which Cambio to update.
     */
    where: CambioWhereUniqueInput
  }

  /**
   * Cambio updateMany
   */
  export type CambioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Cambios.
     */
    data: XOR<CambioUpdateManyMutationInput, CambioUncheckedUpdateManyInput>
    /**
     * Filter which Cambios to update
     */
    where?: CambioWhereInput
    /**
     * Limit how many Cambios to update.
     */
    limit?: number
  }

  /**
   * Cambio updateManyAndReturn
   */
  export type CambioUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * The data used to update Cambios.
     */
    data: XOR<CambioUpdateManyMutationInput, CambioUncheckedUpdateManyInput>
    /**
     * Filter which Cambios to update
     */
    where?: CambioWhereInput
    /**
     * Limit how many Cambios to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Cambio upsert
   */
  export type CambioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * The filter to search for the Cambio to update in case it exists.
     */
    where: CambioWhereUniqueInput
    /**
     * In case the Cambio found by the `where` argument doesn't exist, create a new Cambio with this data.
     */
    create: XOR<CambioCreateInput, CambioUncheckedCreateInput>
    /**
     * In case the Cambio was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CambioUpdateInput, CambioUncheckedUpdateInput>
  }

  /**
   * Cambio delete
   */
  export type CambioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
    /**
     * Filter which Cambio to delete.
     */
    where: CambioWhereUniqueInput
  }

  /**
   * Cambio deleteMany
   */
  export type CambioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cambios to delete
     */
    where?: CambioWhereInput
    /**
     * Limit how many Cambios to delete.
     */
    limit?: number
  }

  /**
   * Cambio without action
   */
  export type CambioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cambio
     */
    select?: CambioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cambio
     */
    omit?: CambioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CambioInclude<ExtArgs> | null
  }


  /**
   * Model IncidenteTorno
   */

  export type AggregateIncidenteTorno = {
    _count: IncidenteTornoCountAggregateOutputType | null
    _avg: IncidenteTornoAvgAggregateOutputType | null
    _sum: IncidenteTornoSumAggregateOutputType | null
    _min: IncidenteTornoMinAggregateOutputType | null
    _max: IncidenteTornoMaxAggregateOutputType | null
  }

  export type IncidenteTornoAvgAggregateOutputType = {
    id: number | null
    creadoPorId: number | null
    atendidoPorId: number | null
    ruedaSolicitudId: number | null
    rondaServicioId: number | null
  }

  export type IncidenteTornoSumAggregateOutputType = {
    id: number | null
    creadoPorId: number | null
    atendidoPorId: number | null
    ruedaSolicitudId: number | null
    rondaServicioId: number | null
  }

  export type IncidenteTornoMinAggregateOutputType = {
    id: number | null
    tipoFalla: $Enums.TipoFallaTorno | null
    status: $Enums.EstadoIncidenteTornoPadre | null
    resuelto: boolean | null
    comentario: string | null
    creadoPorId: number | null
    atendidoPorId: number | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date | null
    fechaAtencion: Date | null
    fechaTerminacion: Date | null
    fechaActualizacion: Date | null
    ruedaSolicitudId: number | null
    rondaServicioId: number | null
  }

  export type IncidenteTornoMaxAggregateOutputType = {
    id: number | null
    tipoFalla: $Enums.TipoFallaTorno | null
    status: $Enums.EstadoIncidenteTornoPadre | null
    resuelto: boolean | null
    comentario: string | null
    creadoPorId: number | null
    atendidoPorId: number | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date | null
    fechaAtencion: Date | null
    fechaTerminacion: Date | null
    fechaActualizacion: Date | null
    ruedaSolicitudId: number | null
    rondaServicioId: number | null
  }

  export type IncidenteTornoCountAggregateOutputType = {
    id: number
    tipoFalla: number
    status: number
    resuelto: number
    comentario: number
    creadoPorId: number
    atendidoPorId: number
    imagen1: number
    imagen2: number
    imagen3: number
    fechaCreacion: number
    fechaAtencion: number
    fechaTerminacion: number
    fechaActualizacion: number
    ruedaSolicitudId: number
    rondaServicioId: number
    _all: number
  }


  export type IncidenteTornoAvgAggregateInputType = {
    id?: true
    creadoPorId?: true
    atendidoPorId?: true
    ruedaSolicitudId?: true
    rondaServicioId?: true
  }

  export type IncidenteTornoSumAggregateInputType = {
    id?: true
    creadoPorId?: true
    atendidoPorId?: true
    ruedaSolicitudId?: true
    rondaServicioId?: true
  }

  export type IncidenteTornoMinAggregateInputType = {
    id?: true
    tipoFalla?: true
    status?: true
    resuelto?: true
    comentario?: true
    creadoPorId?: true
    atendidoPorId?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaAtencion?: true
    fechaTerminacion?: true
    fechaActualizacion?: true
    ruedaSolicitudId?: true
    rondaServicioId?: true
  }

  export type IncidenteTornoMaxAggregateInputType = {
    id?: true
    tipoFalla?: true
    status?: true
    resuelto?: true
    comentario?: true
    creadoPorId?: true
    atendidoPorId?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaAtencion?: true
    fechaTerminacion?: true
    fechaActualizacion?: true
    ruedaSolicitudId?: true
    rondaServicioId?: true
  }

  export type IncidenteTornoCountAggregateInputType = {
    id?: true
    tipoFalla?: true
    status?: true
    resuelto?: true
    comentario?: true
    creadoPorId?: true
    atendidoPorId?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaAtencion?: true
    fechaTerminacion?: true
    fechaActualizacion?: true
    ruedaSolicitudId?: true
    rondaServicioId?: true
    _all?: true
  }

  export type IncidenteTornoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTorno to aggregate.
     */
    where?: IncidenteTornoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornos to fetch.
     */
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IncidenteTornoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IncidenteTornos
    **/
    _count?: true | IncidenteTornoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: IncidenteTornoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: IncidenteTornoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IncidenteTornoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IncidenteTornoMaxAggregateInputType
  }

  export type GetIncidenteTornoAggregateType<T extends IncidenteTornoAggregateArgs> = {
        [P in keyof T & keyof AggregateIncidenteTorno]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIncidenteTorno[P]>
      : GetScalarType<T[P], AggregateIncidenteTorno[P]>
  }




  export type IncidenteTornoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTornoWhereInput
    orderBy?: IncidenteTornoOrderByWithAggregationInput | IncidenteTornoOrderByWithAggregationInput[]
    by: IncidenteTornoScalarFieldEnum[] | IncidenteTornoScalarFieldEnum
    having?: IncidenteTornoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IncidenteTornoCountAggregateInputType | true
    _avg?: IncidenteTornoAvgAggregateInputType
    _sum?: IncidenteTornoSumAggregateInputType
    _min?: IncidenteTornoMinAggregateInputType
    _max?: IncidenteTornoMaxAggregateInputType
  }

  export type IncidenteTornoGroupByOutputType = {
    id: number
    tipoFalla: $Enums.TipoFallaTorno
    status: $Enums.EstadoIncidenteTornoPadre
    resuelto: boolean
    comentario: string | null
    creadoPorId: number
    atendidoPorId: number | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date
    fechaAtencion: Date | null
    fechaTerminacion: Date | null
    fechaActualizacion: Date
    ruedaSolicitudId: number | null
    rondaServicioId: number | null
    _count: IncidenteTornoCountAggregateOutputType | null
    _avg: IncidenteTornoAvgAggregateOutputType | null
    _sum: IncidenteTornoSumAggregateOutputType | null
    _min: IncidenteTornoMinAggregateOutputType | null
    _max: IncidenteTornoMaxAggregateOutputType | null
  }

  type GetIncidenteTornoGroupByPayload<T extends IncidenteTornoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IncidenteTornoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IncidenteTornoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IncidenteTornoGroupByOutputType[P]>
            : GetScalarType<T[P], IncidenteTornoGroupByOutputType[P]>
        }
      >
    >


  export type IncidenteTornoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tipoFalla?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    creadoPorId?: boolean
    atendidoPorId?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaAtencion?: boolean
    fechaTerminacion?: boolean
    fechaActualizacion?: boolean
    ruedaSolicitudId?: boolean
    rondaServicioId?: boolean
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
    rondasDetenidas?: boolean | IncidenteTorno$rondasDetenidasArgs<ExtArgs>
    rondasCanceladas?: boolean | IncidenteTorno$rondasCanceladasArgs<ExtArgs>
    hijos?: boolean | IncidenteTorno$hijosArgs<ExtArgs>
    _count?: boolean | IncidenteTornoCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorno"]>

  export type IncidenteTornoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tipoFalla?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    creadoPorId?: boolean
    atendidoPorId?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaAtencion?: boolean
    fechaTerminacion?: boolean
    fechaActualizacion?: boolean
    ruedaSolicitudId?: boolean
    rondaServicioId?: boolean
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorno"]>

  export type IncidenteTornoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tipoFalla?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    creadoPorId?: boolean
    atendidoPorId?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaAtencion?: boolean
    fechaTerminacion?: boolean
    fechaActualizacion?: boolean
    ruedaSolicitudId?: boolean
    rondaServicioId?: boolean
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorno"]>

  export type IncidenteTornoSelectScalar = {
    id?: boolean
    tipoFalla?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    creadoPorId?: boolean
    atendidoPorId?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaAtencion?: boolean
    fechaTerminacion?: boolean
    fechaActualizacion?: boolean
    ruedaSolicitudId?: boolean
    rondaServicioId?: boolean
  }

  export type IncidenteTornoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "tipoFalla" | "status" | "resuelto" | "comentario" | "creadoPorId" | "atendidoPorId" | "imagen1" | "imagen2" | "imagen3" | "fechaCreacion" | "fechaAtencion" | "fechaTerminacion" | "fechaActualizacion" | "ruedaSolicitudId" | "rondaServicioId", ExtArgs["result"]["incidenteTorno"]>
  export type IncidenteTornoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
    rondasDetenidas?: boolean | IncidenteTorno$rondasDetenidasArgs<ExtArgs>
    rondasCanceladas?: boolean | IncidenteTorno$rondasCanceladasArgs<ExtArgs>
    hijos?: boolean | IncidenteTorno$hijosArgs<ExtArgs>
    _count?: boolean | IncidenteTornoCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type IncidenteTornoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
  }
  export type IncidenteTornoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ruedaSolicitud?: boolean | IncidenteTorno$ruedaSolicitudArgs<ExtArgs>
    rondaServicio?: boolean | IncidenteTorno$rondaServicioArgs<ExtArgs>
  }

  export type $IncidenteTornoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IncidenteTorno"
    objects: {
      ruedaSolicitud: Prisma.$RuedaSolicitudPayload<ExtArgs> | null
      rondaServicio: Prisma.$RondaServicioPayload<ExtArgs> | null
      rondasDetenidas: Prisma.$RondaServicioPayload<ExtArgs>[]
      rondasCanceladas: Prisma.$RondaServicioPayload<ExtArgs>[]
      hijos: Prisma.$IncidenteTornoHijoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      tipoFalla: $Enums.TipoFallaTorno
      status: $Enums.EstadoIncidenteTornoPadre
      resuelto: boolean
      comentario: string | null
      creadoPorId: number
      atendidoPorId: number | null
      imagen1: string | null
      imagen2: string | null
      imagen3: string | null
      fechaCreacion: Date
      fechaAtencion: Date | null
      fechaTerminacion: Date | null
      fechaActualizacion: Date
      ruedaSolicitudId: number | null
      rondaServicioId: number | null
    }, ExtArgs["result"]["incidenteTorno"]>
    composites: {}
  }

  type IncidenteTornoGetPayload<S extends boolean | null | undefined | IncidenteTornoDefaultArgs> = $Result.GetResult<Prisma.$IncidenteTornoPayload, S>

  type IncidenteTornoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IncidenteTornoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IncidenteTornoCountAggregateInputType | true
    }

  export interface IncidenteTornoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IncidenteTorno'], meta: { name: 'IncidenteTorno' } }
    /**
     * Find zero or one IncidenteTorno that matches the filter.
     * @param {IncidenteTornoFindUniqueArgs} args - Arguments to find a IncidenteTorno
     * @example
     * // Get one IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IncidenteTornoFindUniqueArgs>(args: SelectSubset<T, IncidenteTornoFindUniqueArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IncidenteTorno that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IncidenteTornoFindUniqueOrThrowArgs} args - Arguments to find a IncidenteTorno
     * @example
     * // Get one IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IncidenteTornoFindUniqueOrThrowArgs>(args: SelectSubset<T, IncidenteTornoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorno that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoFindFirstArgs} args - Arguments to find a IncidenteTorno
     * @example
     * // Get one IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IncidenteTornoFindFirstArgs>(args?: SelectSubset<T, IncidenteTornoFindFirstArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorno that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoFindFirstOrThrowArgs} args - Arguments to find a IncidenteTorno
     * @example
     * // Get one IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IncidenteTornoFindFirstOrThrowArgs>(args?: SelectSubset<T, IncidenteTornoFindFirstOrThrowArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IncidenteTornos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IncidenteTornos
     * const incidenteTornos = await prisma.incidenteTorno.findMany()
     * 
     * // Get first 10 IncidenteTornos
     * const incidenteTornos = await prisma.incidenteTorno.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const incidenteTornoWithIdOnly = await prisma.incidenteTorno.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IncidenteTornoFindManyArgs>(args?: SelectSubset<T, IncidenteTornoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IncidenteTorno.
     * @param {IncidenteTornoCreateArgs} args - Arguments to create a IncidenteTorno.
     * @example
     * // Create one IncidenteTorno
     * const IncidenteTorno = await prisma.incidenteTorno.create({
     *   data: {
     *     // ... data to create a IncidenteTorno
     *   }
     * })
     * 
     */
    create<T extends IncidenteTornoCreateArgs>(args: SelectSubset<T, IncidenteTornoCreateArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IncidenteTornos.
     * @param {IncidenteTornoCreateManyArgs} args - Arguments to create many IncidenteTornos.
     * @example
     * // Create many IncidenteTornos
     * const incidenteTorno = await prisma.incidenteTorno.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IncidenteTornoCreateManyArgs>(args?: SelectSubset<T, IncidenteTornoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many IncidenteTornos and returns the data saved in the database.
     * @param {IncidenteTornoCreateManyAndReturnArgs} args - Arguments to create many IncidenteTornos.
     * @example
     * // Create many IncidenteTornos
     * const incidenteTorno = await prisma.incidenteTorno.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many IncidenteTornos and only return the `id`
     * const incidenteTornoWithIdOnly = await prisma.incidenteTorno.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends IncidenteTornoCreateManyAndReturnArgs>(args?: SelectSubset<T, IncidenteTornoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a IncidenteTorno.
     * @param {IncidenteTornoDeleteArgs} args - Arguments to delete one IncidenteTorno.
     * @example
     * // Delete one IncidenteTorno
     * const IncidenteTorno = await prisma.incidenteTorno.delete({
     *   where: {
     *     // ... filter to delete one IncidenteTorno
     *   }
     * })
     * 
     */
    delete<T extends IncidenteTornoDeleteArgs>(args: SelectSubset<T, IncidenteTornoDeleteArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IncidenteTorno.
     * @param {IncidenteTornoUpdateArgs} args - Arguments to update one IncidenteTorno.
     * @example
     * // Update one IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IncidenteTornoUpdateArgs>(args: SelectSubset<T, IncidenteTornoUpdateArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IncidenteTornos.
     * @param {IncidenteTornoDeleteManyArgs} args - Arguments to filter IncidenteTornos to delete.
     * @example
     * // Delete a few IncidenteTornos
     * const { count } = await prisma.incidenteTorno.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IncidenteTornoDeleteManyArgs>(args?: SelectSubset<T, IncidenteTornoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTornos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IncidenteTornos
     * const incidenteTorno = await prisma.incidenteTorno.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IncidenteTornoUpdateManyArgs>(args: SelectSubset<T, IncidenteTornoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTornos and returns the data updated in the database.
     * @param {IncidenteTornoUpdateManyAndReturnArgs} args - Arguments to update many IncidenteTornos.
     * @example
     * // Update many IncidenteTornos
     * const incidenteTorno = await prisma.incidenteTorno.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more IncidenteTornos and only return the `id`
     * const incidenteTornoWithIdOnly = await prisma.incidenteTorno.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends IncidenteTornoUpdateManyAndReturnArgs>(args: SelectSubset<T, IncidenteTornoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one IncidenteTorno.
     * @param {IncidenteTornoUpsertArgs} args - Arguments to update or create a IncidenteTorno.
     * @example
     * // Update or create a IncidenteTorno
     * const incidenteTorno = await prisma.incidenteTorno.upsert({
     *   create: {
     *     // ... data to create a IncidenteTorno
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IncidenteTorno we want to update
     *   }
     * })
     */
    upsert<T extends IncidenteTornoUpsertArgs>(args: SelectSubset<T, IncidenteTornoUpsertArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of IncidenteTornos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoCountArgs} args - Arguments to filter IncidenteTornos to count.
     * @example
     * // Count the number of IncidenteTornos
     * const count = await prisma.incidenteTorno.count({
     *   where: {
     *     // ... the filter for the IncidenteTornos we want to count
     *   }
     * })
    **/
    count<T extends IncidenteTornoCountArgs>(
      args?: Subset<T, IncidenteTornoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IncidenteTornoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IncidenteTorno.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends IncidenteTornoAggregateArgs>(args: Subset<T, IncidenteTornoAggregateArgs>): Prisma.PrismaPromise<GetIncidenteTornoAggregateType<T>>

    /**
     * Group by IncidenteTorno.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends IncidenteTornoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IncidenteTornoGroupByArgs['orderBy'] }
        : { orderBy?: IncidenteTornoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, IncidenteTornoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIncidenteTornoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IncidenteTorno model
   */
  readonly fields: IncidenteTornoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IncidenteTorno.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IncidenteTornoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ruedaSolicitud<T extends IncidenteTorno$ruedaSolicitudArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorno$ruedaSolicitudArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    rondaServicio<T extends IncidenteTorno$rondaServicioArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorno$rondaServicioArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    rondasDetenidas<T extends IncidenteTorno$rondasDetenidasArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorno$rondasDetenidasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    rondasCanceladas<T extends IncidenteTorno$rondasCanceladasArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorno$rondasCanceladasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    hijos<T extends IncidenteTorno$hijosArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorno$hijosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the IncidenteTorno model
   */
  interface IncidenteTornoFieldRefs {
    readonly id: FieldRef<"IncidenteTorno", 'Int'>
    readonly tipoFalla: FieldRef<"IncidenteTorno", 'TipoFallaTorno'>
    readonly status: FieldRef<"IncidenteTorno", 'EstadoIncidenteTornoPadre'>
    readonly resuelto: FieldRef<"IncidenteTorno", 'Boolean'>
    readonly comentario: FieldRef<"IncidenteTorno", 'String'>
    readonly creadoPorId: FieldRef<"IncidenteTorno", 'Int'>
    readonly atendidoPorId: FieldRef<"IncidenteTorno", 'Int'>
    readonly imagen1: FieldRef<"IncidenteTorno", 'String'>
    readonly imagen2: FieldRef<"IncidenteTorno", 'String'>
    readonly imagen3: FieldRef<"IncidenteTorno", 'String'>
    readonly fechaCreacion: FieldRef<"IncidenteTorno", 'DateTime'>
    readonly fechaAtencion: FieldRef<"IncidenteTorno", 'DateTime'>
    readonly fechaTerminacion: FieldRef<"IncidenteTorno", 'DateTime'>
    readonly fechaActualizacion: FieldRef<"IncidenteTorno", 'DateTime'>
    readonly ruedaSolicitudId: FieldRef<"IncidenteTorno", 'Int'>
    readonly rondaServicioId: FieldRef<"IncidenteTorno", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * IncidenteTorno findUnique
   */
  export type IncidenteTornoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorno to fetch.
     */
    where: IncidenteTornoWhereUniqueInput
  }

  /**
   * IncidenteTorno findUniqueOrThrow
   */
  export type IncidenteTornoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorno to fetch.
     */
    where: IncidenteTornoWhereUniqueInput
  }

  /**
   * IncidenteTorno findFirst
   */
  export type IncidenteTornoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorno to fetch.
     */
    where?: IncidenteTornoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornos to fetch.
     */
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTornos.
     */
    cursor?: IncidenteTornoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTornos.
     */
    distinct?: IncidenteTornoScalarFieldEnum | IncidenteTornoScalarFieldEnum[]
  }

  /**
   * IncidenteTorno findFirstOrThrow
   */
  export type IncidenteTornoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorno to fetch.
     */
    where?: IncidenteTornoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornos to fetch.
     */
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTornos.
     */
    cursor?: IncidenteTornoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTornos.
     */
    distinct?: IncidenteTornoScalarFieldEnum | IncidenteTornoScalarFieldEnum[]
  }

  /**
   * IncidenteTorno findMany
   */
  export type IncidenteTornoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornos to fetch.
     */
    where?: IncidenteTornoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornos to fetch.
     */
    orderBy?: IncidenteTornoOrderByWithRelationInput | IncidenteTornoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IncidenteTornos.
     */
    cursor?: IncidenteTornoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornos.
     */
    skip?: number
    distinct?: IncidenteTornoScalarFieldEnum | IncidenteTornoScalarFieldEnum[]
  }

  /**
   * IncidenteTorno create
   */
  export type IncidenteTornoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * The data needed to create a IncidenteTorno.
     */
    data: XOR<IncidenteTornoCreateInput, IncidenteTornoUncheckedCreateInput>
  }

  /**
   * IncidenteTorno createMany
   */
  export type IncidenteTornoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IncidenteTornos.
     */
    data: IncidenteTornoCreateManyInput | IncidenteTornoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * IncidenteTorno createManyAndReturn
   */
  export type IncidenteTornoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * The data used to create many IncidenteTornos.
     */
    data: IncidenteTornoCreateManyInput | IncidenteTornoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorno update
   */
  export type IncidenteTornoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * The data needed to update a IncidenteTorno.
     */
    data: XOR<IncidenteTornoUpdateInput, IncidenteTornoUncheckedUpdateInput>
    /**
     * Choose, which IncidenteTorno to update.
     */
    where: IncidenteTornoWhereUniqueInput
  }

  /**
   * IncidenteTorno updateMany
   */
  export type IncidenteTornoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IncidenteTornos.
     */
    data: XOR<IncidenteTornoUpdateManyMutationInput, IncidenteTornoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTornos to update
     */
    where?: IncidenteTornoWhereInput
    /**
     * Limit how many IncidenteTornos to update.
     */
    limit?: number
  }

  /**
   * IncidenteTorno updateManyAndReturn
   */
  export type IncidenteTornoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * The data used to update IncidenteTornos.
     */
    data: XOR<IncidenteTornoUpdateManyMutationInput, IncidenteTornoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTornos to update
     */
    where?: IncidenteTornoWhereInput
    /**
     * Limit how many IncidenteTornos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorno upsert
   */
  export type IncidenteTornoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * The filter to search for the IncidenteTorno to update in case it exists.
     */
    where: IncidenteTornoWhereUniqueInput
    /**
     * In case the IncidenteTorno found by the `where` argument doesn't exist, create a new IncidenteTorno with this data.
     */
    create: XOR<IncidenteTornoCreateInput, IncidenteTornoUncheckedCreateInput>
    /**
     * In case the IncidenteTorno was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IncidenteTornoUpdateInput, IncidenteTornoUncheckedUpdateInput>
  }

  /**
   * IncidenteTorno delete
   */
  export type IncidenteTornoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
    /**
     * Filter which IncidenteTorno to delete.
     */
    where: IncidenteTornoWhereUniqueInput
  }

  /**
   * IncidenteTorno deleteMany
   */
  export type IncidenteTornoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTornos to delete
     */
    where?: IncidenteTornoWhereInput
    /**
     * Limit how many IncidenteTornos to delete.
     */
    limit?: number
  }

  /**
   * IncidenteTorno.ruedaSolicitud
   */
  export type IncidenteTorno$ruedaSolicitudArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    where?: RuedaSolicitudWhereInput
  }

  /**
   * IncidenteTorno.rondaServicio
   */
  export type IncidenteTorno$rondaServicioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
  }

  /**
   * IncidenteTorno.rondasDetenidas
   */
  export type IncidenteTorno$rondasDetenidasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    cursor?: RondaServicioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RondaServicioScalarFieldEnum | RondaServicioScalarFieldEnum[]
  }

  /**
   * IncidenteTorno.rondasCanceladas
   */
  export type IncidenteTorno$rondasCanceladasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
    orderBy?: RondaServicioOrderByWithRelationInput | RondaServicioOrderByWithRelationInput[]
    cursor?: RondaServicioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RondaServicioScalarFieldEnum | RondaServicioScalarFieldEnum[]
  }

  /**
   * IncidenteTorno.hijos
   */
  export type IncidenteTorno$hijosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    where?: IncidenteTornoHijoWhereInput
    orderBy?: IncidenteTornoHijoOrderByWithRelationInput | IncidenteTornoHijoOrderByWithRelationInput[]
    cursor?: IncidenteTornoHijoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: IncidenteTornoHijoScalarFieldEnum | IncidenteTornoHijoScalarFieldEnum[]
  }

  /**
   * IncidenteTorno without action
   */
  export type IncidenteTornoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorno
     */
    select?: IncidenteTornoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorno
     */
    omit?: IncidenteTornoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoInclude<ExtArgs> | null
  }


  /**
   * Model IncidenteTornoHijo
   */

  export type AggregateIncidenteTornoHijo = {
    _count: IncidenteTornoHijoCountAggregateOutputType | null
    _avg: IncidenteTornoHijoAvgAggregateOutputType | null
    _sum: IncidenteTornoHijoSumAggregateOutputType | null
    _min: IncidenteTornoHijoMinAggregateOutputType | null
    _max: IncidenteTornoHijoMaxAggregateOutputType | null
  }

  export type IncidenteTornoHijoAvgAggregateOutputType = {
    id: number | null
    incidenteTornoId: number | null
  }

  export type IncidenteTornoHijoSumAggregateOutputType = {
    id: number | null
    incidenteTornoId: number | null
  }

  export type IncidenteTornoHijoMinAggregateOutputType = {
    id: number | null
    incidenteTornoId: number | null
    status: $Enums.EstadoIncidenteTornoHijo | null
    resuelto: boolean | null
    comentario: string | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date | null
    fechaActualizacion: Date | null
  }

  export type IncidenteTornoHijoMaxAggregateOutputType = {
    id: number | null
    incidenteTornoId: number | null
    status: $Enums.EstadoIncidenteTornoHijo | null
    resuelto: boolean | null
    comentario: string | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date | null
    fechaActualizacion: Date | null
  }

  export type IncidenteTornoHijoCountAggregateOutputType = {
    id: number
    incidenteTornoId: number
    status: number
    resuelto: number
    comentario: number
    imagen1: number
    imagen2: number
    imagen3: number
    fechaCreacion: number
    fechaActualizacion: number
    _all: number
  }


  export type IncidenteTornoHijoAvgAggregateInputType = {
    id?: true
    incidenteTornoId?: true
  }

  export type IncidenteTornoHijoSumAggregateInputType = {
    id?: true
    incidenteTornoId?: true
  }

  export type IncidenteTornoHijoMinAggregateInputType = {
    id?: true
    incidenteTornoId?: true
    status?: true
    resuelto?: true
    comentario?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaActualizacion?: true
  }

  export type IncidenteTornoHijoMaxAggregateInputType = {
    id?: true
    incidenteTornoId?: true
    status?: true
    resuelto?: true
    comentario?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaActualizacion?: true
  }

  export type IncidenteTornoHijoCountAggregateInputType = {
    id?: true
    incidenteTornoId?: true
    status?: true
    resuelto?: true
    comentario?: true
    imagen1?: true
    imagen2?: true
    imagen3?: true
    fechaCreacion?: true
    fechaActualizacion?: true
    _all?: true
  }

  export type IncidenteTornoHijoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTornoHijo to aggregate.
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornoHijos to fetch.
     */
    orderBy?: IncidenteTornoHijoOrderByWithRelationInput | IncidenteTornoHijoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IncidenteTornoHijoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornoHijos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornoHijos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IncidenteTornoHijos
    **/
    _count?: true | IncidenteTornoHijoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: IncidenteTornoHijoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: IncidenteTornoHijoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IncidenteTornoHijoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IncidenteTornoHijoMaxAggregateInputType
  }

  export type GetIncidenteTornoHijoAggregateType<T extends IncidenteTornoHijoAggregateArgs> = {
        [P in keyof T & keyof AggregateIncidenteTornoHijo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIncidenteTornoHijo[P]>
      : GetScalarType<T[P], AggregateIncidenteTornoHijo[P]>
  }




  export type IncidenteTornoHijoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTornoHijoWhereInput
    orderBy?: IncidenteTornoHijoOrderByWithAggregationInput | IncidenteTornoHijoOrderByWithAggregationInput[]
    by: IncidenteTornoHijoScalarFieldEnum[] | IncidenteTornoHijoScalarFieldEnum
    having?: IncidenteTornoHijoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IncidenteTornoHijoCountAggregateInputType | true
    _avg?: IncidenteTornoHijoAvgAggregateInputType
    _sum?: IncidenteTornoHijoSumAggregateInputType
    _min?: IncidenteTornoHijoMinAggregateInputType
    _max?: IncidenteTornoHijoMaxAggregateInputType
  }

  export type IncidenteTornoHijoGroupByOutputType = {
    id: number
    incidenteTornoId: number
    status: $Enums.EstadoIncidenteTornoHijo
    resuelto: boolean
    comentario: string | null
    imagen1: string | null
    imagen2: string | null
    imagen3: string | null
    fechaCreacion: Date
    fechaActualizacion: Date
    _count: IncidenteTornoHijoCountAggregateOutputType | null
    _avg: IncidenteTornoHijoAvgAggregateOutputType | null
    _sum: IncidenteTornoHijoSumAggregateOutputType | null
    _min: IncidenteTornoHijoMinAggregateOutputType | null
    _max: IncidenteTornoHijoMaxAggregateOutputType | null
  }

  type GetIncidenteTornoHijoGroupByPayload<T extends IncidenteTornoHijoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IncidenteTornoHijoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IncidenteTornoHijoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IncidenteTornoHijoGroupByOutputType[P]>
            : GetScalarType<T[P], IncidenteTornoHijoGroupByOutputType[P]>
        }
      >
    >


  export type IncidenteTornoHijoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteTornoId?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaActualizacion?: boolean
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTornoHijo"]>

  export type IncidenteTornoHijoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteTornoId?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaActualizacion?: boolean
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTornoHijo"]>

  export type IncidenteTornoHijoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteTornoId?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaActualizacion?: boolean
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTornoHijo"]>

  export type IncidenteTornoHijoSelectScalar = {
    id?: boolean
    incidenteTornoId?: boolean
    status?: boolean
    resuelto?: boolean
    comentario?: boolean
    imagen1?: boolean
    imagen2?: boolean
    imagen3?: boolean
    fechaCreacion?: boolean
    fechaActualizacion?: boolean
  }

  export type IncidenteTornoHijoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "incidenteTornoId" | "status" | "resuelto" | "comentario" | "imagen1" | "imagen2" | "imagen3" | "fechaCreacion" | "fechaActualizacion", ExtArgs["result"]["incidenteTornoHijo"]>
  export type IncidenteTornoHijoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }
  export type IncidenteTornoHijoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }
  export type IncidenteTornoHijoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidenteTorno?: boolean | IncidenteTornoDefaultArgs<ExtArgs>
  }

  export type $IncidenteTornoHijoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IncidenteTornoHijo"
    objects: {
      incidenteTorno: Prisma.$IncidenteTornoPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      incidenteTornoId: number
      status: $Enums.EstadoIncidenteTornoHijo
      resuelto: boolean
      comentario: string | null
      imagen1: string | null
      imagen2: string | null
      imagen3: string | null
      fechaCreacion: Date
      fechaActualizacion: Date
    }, ExtArgs["result"]["incidenteTornoHijo"]>
    composites: {}
  }

  type IncidenteTornoHijoGetPayload<S extends boolean | null | undefined | IncidenteTornoHijoDefaultArgs> = $Result.GetResult<Prisma.$IncidenteTornoHijoPayload, S>

  type IncidenteTornoHijoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IncidenteTornoHijoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IncidenteTornoHijoCountAggregateInputType | true
    }

  export interface IncidenteTornoHijoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IncidenteTornoHijo'], meta: { name: 'IncidenteTornoHijo' } }
    /**
     * Find zero or one IncidenteTornoHijo that matches the filter.
     * @param {IncidenteTornoHijoFindUniqueArgs} args - Arguments to find a IncidenteTornoHijo
     * @example
     * // Get one IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IncidenteTornoHijoFindUniqueArgs>(args: SelectSubset<T, IncidenteTornoHijoFindUniqueArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IncidenteTornoHijo that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IncidenteTornoHijoFindUniqueOrThrowArgs} args - Arguments to find a IncidenteTornoHijo
     * @example
     * // Get one IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IncidenteTornoHijoFindUniqueOrThrowArgs>(args: SelectSubset<T, IncidenteTornoHijoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTornoHijo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoFindFirstArgs} args - Arguments to find a IncidenteTornoHijo
     * @example
     * // Get one IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IncidenteTornoHijoFindFirstArgs>(args?: SelectSubset<T, IncidenteTornoHijoFindFirstArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTornoHijo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoFindFirstOrThrowArgs} args - Arguments to find a IncidenteTornoHijo
     * @example
     * // Get one IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IncidenteTornoHijoFindFirstOrThrowArgs>(args?: SelectSubset<T, IncidenteTornoHijoFindFirstOrThrowArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IncidenteTornoHijos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IncidenteTornoHijos
     * const incidenteTornoHijos = await prisma.incidenteTornoHijo.findMany()
     * 
     * // Get first 10 IncidenteTornoHijos
     * const incidenteTornoHijos = await prisma.incidenteTornoHijo.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const incidenteTornoHijoWithIdOnly = await prisma.incidenteTornoHijo.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IncidenteTornoHijoFindManyArgs>(args?: SelectSubset<T, IncidenteTornoHijoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IncidenteTornoHijo.
     * @param {IncidenteTornoHijoCreateArgs} args - Arguments to create a IncidenteTornoHijo.
     * @example
     * // Create one IncidenteTornoHijo
     * const IncidenteTornoHijo = await prisma.incidenteTornoHijo.create({
     *   data: {
     *     // ... data to create a IncidenteTornoHijo
     *   }
     * })
     * 
     */
    create<T extends IncidenteTornoHijoCreateArgs>(args: SelectSubset<T, IncidenteTornoHijoCreateArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IncidenteTornoHijos.
     * @param {IncidenteTornoHijoCreateManyArgs} args - Arguments to create many IncidenteTornoHijos.
     * @example
     * // Create many IncidenteTornoHijos
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IncidenteTornoHijoCreateManyArgs>(args?: SelectSubset<T, IncidenteTornoHijoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many IncidenteTornoHijos and returns the data saved in the database.
     * @param {IncidenteTornoHijoCreateManyAndReturnArgs} args - Arguments to create many IncidenteTornoHijos.
     * @example
     * // Create many IncidenteTornoHijos
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many IncidenteTornoHijos and only return the `id`
     * const incidenteTornoHijoWithIdOnly = await prisma.incidenteTornoHijo.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends IncidenteTornoHijoCreateManyAndReturnArgs>(args?: SelectSubset<T, IncidenteTornoHijoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a IncidenteTornoHijo.
     * @param {IncidenteTornoHijoDeleteArgs} args - Arguments to delete one IncidenteTornoHijo.
     * @example
     * // Delete one IncidenteTornoHijo
     * const IncidenteTornoHijo = await prisma.incidenteTornoHijo.delete({
     *   where: {
     *     // ... filter to delete one IncidenteTornoHijo
     *   }
     * })
     * 
     */
    delete<T extends IncidenteTornoHijoDeleteArgs>(args: SelectSubset<T, IncidenteTornoHijoDeleteArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IncidenteTornoHijo.
     * @param {IncidenteTornoHijoUpdateArgs} args - Arguments to update one IncidenteTornoHijo.
     * @example
     * // Update one IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IncidenteTornoHijoUpdateArgs>(args: SelectSubset<T, IncidenteTornoHijoUpdateArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IncidenteTornoHijos.
     * @param {IncidenteTornoHijoDeleteManyArgs} args - Arguments to filter IncidenteTornoHijos to delete.
     * @example
     * // Delete a few IncidenteTornoHijos
     * const { count } = await prisma.incidenteTornoHijo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IncidenteTornoHijoDeleteManyArgs>(args?: SelectSubset<T, IncidenteTornoHijoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTornoHijos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IncidenteTornoHijos
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IncidenteTornoHijoUpdateManyArgs>(args: SelectSubset<T, IncidenteTornoHijoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTornoHijos and returns the data updated in the database.
     * @param {IncidenteTornoHijoUpdateManyAndReturnArgs} args - Arguments to update many IncidenteTornoHijos.
     * @example
     * // Update many IncidenteTornoHijos
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more IncidenteTornoHijos and only return the `id`
     * const incidenteTornoHijoWithIdOnly = await prisma.incidenteTornoHijo.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends IncidenteTornoHijoUpdateManyAndReturnArgs>(args: SelectSubset<T, IncidenteTornoHijoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one IncidenteTornoHijo.
     * @param {IncidenteTornoHijoUpsertArgs} args - Arguments to update or create a IncidenteTornoHijo.
     * @example
     * // Update or create a IncidenteTornoHijo
     * const incidenteTornoHijo = await prisma.incidenteTornoHijo.upsert({
     *   create: {
     *     // ... data to create a IncidenteTornoHijo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IncidenteTornoHijo we want to update
     *   }
     * })
     */
    upsert<T extends IncidenteTornoHijoUpsertArgs>(args: SelectSubset<T, IncidenteTornoHijoUpsertArgs<ExtArgs>>): Prisma__IncidenteTornoHijoClient<$Result.GetResult<Prisma.$IncidenteTornoHijoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of IncidenteTornoHijos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoCountArgs} args - Arguments to filter IncidenteTornoHijos to count.
     * @example
     * // Count the number of IncidenteTornoHijos
     * const count = await prisma.incidenteTornoHijo.count({
     *   where: {
     *     // ... the filter for the IncidenteTornoHijos we want to count
     *   }
     * })
    **/
    count<T extends IncidenteTornoHijoCountArgs>(
      args?: Subset<T, IncidenteTornoHijoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IncidenteTornoHijoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IncidenteTornoHijo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends IncidenteTornoHijoAggregateArgs>(args: Subset<T, IncidenteTornoHijoAggregateArgs>): Prisma.PrismaPromise<GetIncidenteTornoHijoAggregateType<T>>

    /**
     * Group by IncidenteTornoHijo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTornoHijoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends IncidenteTornoHijoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IncidenteTornoHijoGroupByArgs['orderBy'] }
        : { orderBy?: IncidenteTornoHijoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, IncidenteTornoHijoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIncidenteTornoHijoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IncidenteTornoHijo model
   */
  readonly fields: IncidenteTornoHijoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IncidenteTornoHijo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IncidenteTornoHijoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    incidenteTorno<T extends IncidenteTornoDefaultArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTornoDefaultArgs<ExtArgs>>): Prisma__IncidenteTornoClient<$Result.GetResult<Prisma.$IncidenteTornoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the IncidenteTornoHijo model
   */
  interface IncidenteTornoHijoFieldRefs {
    readonly id: FieldRef<"IncidenteTornoHijo", 'Int'>
    readonly incidenteTornoId: FieldRef<"IncidenteTornoHijo", 'Int'>
    readonly status: FieldRef<"IncidenteTornoHijo", 'EstadoIncidenteTornoHijo'>
    readonly resuelto: FieldRef<"IncidenteTornoHijo", 'Boolean'>
    readonly comentario: FieldRef<"IncidenteTornoHijo", 'String'>
    readonly imagen1: FieldRef<"IncidenteTornoHijo", 'String'>
    readonly imagen2: FieldRef<"IncidenteTornoHijo", 'String'>
    readonly imagen3: FieldRef<"IncidenteTornoHijo", 'String'>
    readonly fechaCreacion: FieldRef<"IncidenteTornoHijo", 'DateTime'>
    readonly fechaActualizacion: FieldRef<"IncidenteTornoHijo", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * IncidenteTornoHijo findUnique
   */
  export type IncidenteTornoHijoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornoHijo to fetch.
     */
    where: IncidenteTornoHijoWhereUniqueInput
  }

  /**
   * IncidenteTornoHijo findUniqueOrThrow
   */
  export type IncidenteTornoHijoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornoHijo to fetch.
     */
    where: IncidenteTornoHijoWhereUniqueInput
  }

  /**
   * IncidenteTornoHijo findFirst
   */
  export type IncidenteTornoHijoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornoHijo to fetch.
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornoHijos to fetch.
     */
    orderBy?: IncidenteTornoHijoOrderByWithRelationInput | IncidenteTornoHijoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTornoHijos.
     */
    cursor?: IncidenteTornoHijoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornoHijos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornoHijos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTornoHijos.
     */
    distinct?: IncidenteTornoHijoScalarFieldEnum | IncidenteTornoHijoScalarFieldEnum[]
  }

  /**
   * IncidenteTornoHijo findFirstOrThrow
   */
  export type IncidenteTornoHijoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornoHijo to fetch.
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornoHijos to fetch.
     */
    orderBy?: IncidenteTornoHijoOrderByWithRelationInput | IncidenteTornoHijoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTornoHijos.
     */
    cursor?: IncidenteTornoHijoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornoHijos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornoHijos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTornoHijos.
     */
    distinct?: IncidenteTornoHijoScalarFieldEnum | IncidenteTornoHijoScalarFieldEnum[]
  }

  /**
   * IncidenteTornoHijo findMany
   */
  export type IncidenteTornoHijoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTornoHijos to fetch.
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTornoHijos to fetch.
     */
    orderBy?: IncidenteTornoHijoOrderByWithRelationInput | IncidenteTornoHijoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IncidenteTornoHijos.
     */
    cursor?: IncidenteTornoHijoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTornoHijos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTornoHijos.
     */
    skip?: number
    distinct?: IncidenteTornoHijoScalarFieldEnum | IncidenteTornoHijoScalarFieldEnum[]
  }

  /**
   * IncidenteTornoHijo create
   */
  export type IncidenteTornoHijoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * The data needed to create a IncidenteTornoHijo.
     */
    data: XOR<IncidenteTornoHijoCreateInput, IncidenteTornoHijoUncheckedCreateInput>
  }

  /**
   * IncidenteTornoHijo createMany
   */
  export type IncidenteTornoHijoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IncidenteTornoHijos.
     */
    data: IncidenteTornoHijoCreateManyInput | IncidenteTornoHijoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * IncidenteTornoHijo createManyAndReturn
   */
  export type IncidenteTornoHijoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * The data used to create many IncidenteTornoHijos.
     */
    data: IncidenteTornoHijoCreateManyInput | IncidenteTornoHijoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTornoHijo update
   */
  export type IncidenteTornoHijoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * The data needed to update a IncidenteTornoHijo.
     */
    data: XOR<IncidenteTornoHijoUpdateInput, IncidenteTornoHijoUncheckedUpdateInput>
    /**
     * Choose, which IncidenteTornoHijo to update.
     */
    where: IncidenteTornoHijoWhereUniqueInput
  }

  /**
   * IncidenteTornoHijo updateMany
   */
  export type IncidenteTornoHijoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IncidenteTornoHijos.
     */
    data: XOR<IncidenteTornoHijoUpdateManyMutationInput, IncidenteTornoHijoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTornoHijos to update
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * Limit how many IncidenteTornoHijos to update.
     */
    limit?: number
  }

  /**
   * IncidenteTornoHijo updateManyAndReturn
   */
  export type IncidenteTornoHijoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * The data used to update IncidenteTornoHijos.
     */
    data: XOR<IncidenteTornoHijoUpdateManyMutationInput, IncidenteTornoHijoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTornoHijos to update
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * Limit how many IncidenteTornoHijos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTornoHijo upsert
   */
  export type IncidenteTornoHijoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * The filter to search for the IncidenteTornoHijo to update in case it exists.
     */
    where: IncidenteTornoHijoWhereUniqueInput
    /**
     * In case the IncidenteTornoHijo found by the `where` argument doesn't exist, create a new IncidenteTornoHijo with this data.
     */
    create: XOR<IncidenteTornoHijoCreateInput, IncidenteTornoHijoUncheckedCreateInput>
    /**
     * In case the IncidenteTornoHijo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IncidenteTornoHijoUpdateInput, IncidenteTornoHijoUncheckedUpdateInput>
  }

  /**
   * IncidenteTornoHijo delete
   */
  export type IncidenteTornoHijoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
    /**
     * Filter which IncidenteTornoHijo to delete.
     */
    where: IncidenteTornoHijoWhereUniqueInput
  }

  /**
   * IncidenteTornoHijo deleteMany
   */
  export type IncidenteTornoHijoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTornoHijos to delete
     */
    where?: IncidenteTornoHijoWhereInput
    /**
     * Limit how many IncidenteTornoHijos to delete.
     */
    limit?: number
  }

  /**
   * IncidenteTornoHijo without action
   */
  export type IncidenteTornoHijoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTornoHijo
     */
    select?: IncidenteTornoHijoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTornoHijo
     */
    omit?: IncidenteTornoHijoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTornoHijoInclude<ExtArgs> | null
  }


  /**
   * Model TornoG
   */

  export type AggregateTornoG = {
    _count: TornoGCountAggregateOutputType | null
    _avg: TornoGAvgAggregateOutputType | null
    _sum: TornoGSumAggregateOutputType | null
    _min: TornoGMinAggregateOutputType | null
    _max: TornoGMaxAggregateOutputType | null
  }

  export type TornoGAvgAggregateOutputType = {
    id: number | null
    rondaServicioId: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    cantidadRuedas: number | null
    ruedasTerminadas: number | null
  }

  export type TornoGSumAggregateOutputType = {
    id: number | null
    rondaServicioId: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    cantidadRuedas: number | null
    ruedasTerminadas: number | null
  }

  export type TornoGMinAggregateOutputType = {
    id: number | null
    rondaServicioId: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    estado: $Enums.EstadoTornoG | null
    cantidadRuedas: number | null
    ruedasTerminadas: number | null
    fechaInicio: Date | null
    fechaFin: Date | null
  }

  export type TornoGMaxAggregateOutputType = {
    id: number | null
    rondaServicioId: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number | null
    estado: $Enums.EstadoTornoG | null
    cantidadRuedas: number | null
    ruedasTerminadas: number | null
    fechaInicio: Date | null
    fechaFin: Date | null
  }

  export type TornoGCountAggregateOutputType = {
    id: number
    rondaServicioId: number
    ruedaSolicitudId: number
    ruedasFinalId: number
    torneroId: number
    estado: number
    cantidadRuedas: number
    ruedasTerminadas: number
    fechaInicio: number
    fechaFin: number
    _all: number
  }


  export type TornoGAvgAggregateInputType = {
    id?: true
    rondaServicioId?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    cantidadRuedas?: true
    ruedasTerminadas?: true
  }

  export type TornoGSumAggregateInputType = {
    id?: true
    rondaServicioId?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    cantidadRuedas?: true
    ruedasTerminadas?: true
  }

  export type TornoGMinAggregateInputType = {
    id?: true
    rondaServicioId?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    estado?: true
    cantidadRuedas?: true
    ruedasTerminadas?: true
    fechaInicio?: true
    fechaFin?: true
  }

  export type TornoGMaxAggregateInputType = {
    id?: true
    rondaServicioId?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    estado?: true
    cantidadRuedas?: true
    ruedasTerminadas?: true
    fechaInicio?: true
    fechaFin?: true
  }

  export type TornoGCountAggregateInputType = {
    id?: true
    rondaServicioId?: true
    ruedaSolicitudId?: true
    ruedasFinalId?: true
    torneroId?: true
    estado?: true
    cantidadRuedas?: true
    ruedasTerminadas?: true
    fechaInicio?: true
    fechaFin?: true
    _all?: true
  }

  export type TornoGAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TornoG to aggregate.
     */
    where?: TornoGWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoGS to fetch.
     */
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TornoGWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoGS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoGS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TornoGS
    **/
    _count?: true | TornoGCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TornoGAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TornoGSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TornoGMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TornoGMaxAggregateInputType
  }

  export type GetTornoGAggregateType<T extends TornoGAggregateArgs> = {
        [P in keyof T & keyof AggregateTornoG]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTornoG[P]>
      : GetScalarType<T[P], AggregateTornoG[P]>
  }




  export type TornoGGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TornoGWhereInput
    orderBy?: TornoGOrderByWithAggregationInput | TornoGOrderByWithAggregationInput[]
    by: TornoGScalarFieldEnum[] | TornoGScalarFieldEnum
    having?: TornoGScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TornoGCountAggregateInputType | true
    _avg?: TornoGAvgAggregateInputType
    _sum?: TornoGSumAggregateInputType
    _min?: TornoGMinAggregateInputType
    _max?: TornoGMaxAggregateInputType
  }

  export type TornoGGroupByOutputType = {
    id: number
    rondaServicioId: number | null
    ruedaSolicitudId: number | null
    ruedasFinalId: number | null
    torneroId: number
    estado: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas: number
    fechaInicio: Date | null
    fechaFin: Date | null
    _count: TornoGCountAggregateOutputType | null
    _avg: TornoGAvgAggregateOutputType | null
    _sum: TornoGSumAggregateOutputType | null
    _min: TornoGMinAggregateOutputType | null
    _max: TornoGMaxAggregateOutputType | null
  }

  type GetTornoGGroupByPayload<T extends TornoGGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TornoGGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TornoGGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TornoGGroupByOutputType[P]>
            : GetScalarType<T[P], TornoGGroupByOutputType[P]>
        }
      >
    >


  export type TornoGSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaServicioId?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    torneroId?: boolean
    estado?: boolean
    cantidadRuedas?: boolean
    ruedasTerminadas?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
    detalleRuedas?: boolean | TornoG$detalleRuedasArgs<ExtArgs>
    _count?: boolean | TornoGCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tornoG"]>

  export type TornoGSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaServicioId?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    torneroId?: boolean
    estado?: boolean
    cantidadRuedas?: boolean
    ruedasTerminadas?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
  }, ExtArgs["result"]["tornoG"]>

  export type TornoGSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaServicioId?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    torneroId?: boolean
    estado?: boolean
    cantidadRuedas?: boolean
    ruedasTerminadas?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
  }, ExtArgs["result"]["tornoG"]>

  export type TornoGSelectScalar = {
    id?: boolean
    rondaServicioId?: boolean
    ruedaSolicitudId?: boolean
    ruedasFinalId?: boolean
    torneroId?: boolean
    estado?: boolean
    cantidadRuedas?: boolean
    ruedasTerminadas?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
  }

  export type TornoGOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "rondaServicioId" | "ruedaSolicitudId" | "ruedasFinalId" | "torneroId" | "estado" | "cantidadRuedas" | "ruedasTerminadas" | "fechaInicio" | "fechaFin", ExtArgs["result"]["tornoG"]>
  export type TornoGInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
    detalleRuedas?: boolean | TornoG$detalleRuedasArgs<ExtArgs>
    _count?: boolean | TornoGCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TornoGIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
  }
  export type TornoGIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondaServicio?: boolean | TornoG$rondaServicioArgs<ExtArgs>
    ruedaSolicitud?: boolean | TornoG$ruedaSolicitudArgs<ExtArgs>
    ruedasFinal?: boolean | TornoG$ruedasFinalArgs<ExtArgs>
  }

  export type $TornoGPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TornoG"
    objects: {
      rondaServicio: Prisma.$RondaServicioPayload<ExtArgs> | null
      ruedaSolicitud: Prisma.$RuedaSolicitudPayload<ExtArgs> | null
      ruedasFinal: Prisma.$RuedasFinalPayload<ExtArgs> | null
      detalleRuedas: Prisma.$TornoRuedaTrabajoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      rondaServicioId: number | null
      ruedaSolicitudId: number | null
      ruedasFinalId: number | null
      torneroId: number
      estado: $Enums.EstadoTornoG
      cantidadRuedas: number
      ruedasTerminadas: number
      fechaInicio: Date | null
      fechaFin: Date | null
    }, ExtArgs["result"]["tornoG"]>
    composites: {}
  }

  type TornoGGetPayload<S extends boolean | null | undefined | TornoGDefaultArgs> = $Result.GetResult<Prisma.$TornoGPayload, S>

  type TornoGCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TornoGFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TornoGCountAggregateInputType | true
    }

  export interface TornoGDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TornoG'], meta: { name: 'TornoG' } }
    /**
     * Find zero or one TornoG that matches the filter.
     * @param {TornoGFindUniqueArgs} args - Arguments to find a TornoG
     * @example
     * // Get one TornoG
     * const tornoG = await prisma.tornoG.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TornoGFindUniqueArgs>(args: SelectSubset<T, TornoGFindUniqueArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TornoG that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TornoGFindUniqueOrThrowArgs} args - Arguments to find a TornoG
     * @example
     * // Get one TornoG
     * const tornoG = await prisma.tornoG.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TornoGFindUniqueOrThrowArgs>(args: SelectSubset<T, TornoGFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TornoG that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGFindFirstArgs} args - Arguments to find a TornoG
     * @example
     * // Get one TornoG
     * const tornoG = await prisma.tornoG.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TornoGFindFirstArgs>(args?: SelectSubset<T, TornoGFindFirstArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TornoG that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGFindFirstOrThrowArgs} args - Arguments to find a TornoG
     * @example
     * // Get one TornoG
     * const tornoG = await prisma.tornoG.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TornoGFindFirstOrThrowArgs>(args?: SelectSubset<T, TornoGFindFirstOrThrowArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TornoGS that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TornoGS
     * const tornoGS = await prisma.tornoG.findMany()
     * 
     * // Get first 10 TornoGS
     * const tornoGS = await prisma.tornoG.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tornoGWithIdOnly = await prisma.tornoG.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TornoGFindManyArgs>(args?: SelectSubset<T, TornoGFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TornoG.
     * @param {TornoGCreateArgs} args - Arguments to create a TornoG.
     * @example
     * // Create one TornoG
     * const TornoG = await prisma.tornoG.create({
     *   data: {
     *     // ... data to create a TornoG
     *   }
     * })
     * 
     */
    create<T extends TornoGCreateArgs>(args: SelectSubset<T, TornoGCreateArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TornoGS.
     * @param {TornoGCreateManyArgs} args - Arguments to create many TornoGS.
     * @example
     * // Create many TornoGS
     * const tornoG = await prisma.tornoG.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TornoGCreateManyArgs>(args?: SelectSubset<T, TornoGCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TornoGS and returns the data saved in the database.
     * @param {TornoGCreateManyAndReturnArgs} args - Arguments to create many TornoGS.
     * @example
     * // Create many TornoGS
     * const tornoG = await prisma.tornoG.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TornoGS and only return the `id`
     * const tornoGWithIdOnly = await prisma.tornoG.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TornoGCreateManyAndReturnArgs>(args?: SelectSubset<T, TornoGCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TornoG.
     * @param {TornoGDeleteArgs} args - Arguments to delete one TornoG.
     * @example
     * // Delete one TornoG
     * const TornoG = await prisma.tornoG.delete({
     *   where: {
     *     // ... filter to delete one TornoG
     *   }
     * })
     * 
     */
    delete<T extends TornoGDeleteArgs>(args: SelectSubset<T, TornoGDeleteArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TornoG.
     * @param {TornoGUpdateArgs} args - Arguments to update one TornoG.
     * @example
     * // Update one TornoG
     * const tornoG = await prisma.tornoG.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TornoGUpdateArgs>(args: SelectSubset<T, TornoGUpdateArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TornoGS.
     * @param {TornoGDeleteManyArgs} args - Arguments to filter TornoGS to delete.
     * @example
     * // Delete a few TornoGS
     * const { count } = await prisma.tornoG.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TornoGDeleteManyArgs>(args?: SelectSubset<T, TornoGDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TornoGS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TornoGS
     * const tornoG = await prisma.tornoG.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TornoGUpdateManyArgs>(args: SelectSubset<T, TornoGUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TornoGS and returns the data updated in the database.
     * @param {TornoGUpdateManyAndReturnArgs} args - Arguments to update many TornoGS.
     * @example
     * // Update many TornoGS
     * const tornoG = await prisma.tornoG.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TornoGS and only return the `id`
     * const tornoGWithIdOnly = await prisma.tornoG.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TornoGUpdateManyAndReturnArgs>(args: SelectSubset<T, TornoGUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TornoG.
     * @param {TornoGUpsertArgs} args - Arguments to update or create a TornoG.
     * @example
     * // Update or create a TornoG
     * const tornoG = await prisma.tornoG.upsert({
     *   create: {
     *     // ... data to create a TornoG
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TornoG we want to update
     *   }
     * })
     */
    upsert<T extends TornoGUpsertArgs>(args: SelectSubset<T, TornoGUpsertArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TornoGS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGCountArgs} args - Arguments to filter TornoGS to count.
     * @example
     * // Count the number of TornoGS
     * const count = await prisma.tornoG.count({
     *   where: {
     *     // ... the filter for the TornoGS we want to count
     *   }
     * })
    **/
    count<T extends TornoGCountArgs>(
      args?: Subset<T, TornoGCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TornoGCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TornoG.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TornoGAggregateArgs>(args: Subset<T, TornoGAggregateArgs>): Prisma.PrismaPromise<GetTornoGAggregateType<T>>

    /**
     * Group by TornoG.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoGGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TornoGGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TornoGGroupByArgs['orderBy'] }
        : { orderBy?: TornoGGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TornoGGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTornoGGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TornoG model
   */
  readonly fields: TornoGFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TornoG.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TornoGClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    rondaServicio<T extends TornoG$rondaServicioArgs<ExtArgs> = {}>(args?: Subset<T, TornoG$rondaServicioArgs<ExtArgs>>): Prisma__RondaServicioClient<$Result.GetResult<Prisma.$RondaServicioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    ruedaSolicitud<T extends TornoG$ruedaSolicitudArgs<ExtArgs> = {}>(args?: Subset<T, TornoG$ruedaSolicitudArgs<ExtArgs>>): Prisma__RuedaSolicitudClient<$Result.GetResult<Prisma.$RuedaSolicitudPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    ruedasFinal<T extends TornoG$ruedasFinalArgs<ExtArgs> = {}>(args?: Subset<T, TornoG$ruedasFinalArgs<ExtArgs>>): Prisma__RuedasFinalClient<$Result.GetResult<Prisma.$RuedasFinalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    detalleRuedas<T extends TornoG$detalleRuedasArgs<ExtArgs> = {}>(args?: Subset<T, TornoG$detalleRuedasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TornoG model
   */
  interface TornoGFieldRefs {
    readonly id: FieldRef<"TornoG", 'Int'>
    readonly rondaServicioId: FieldRef<"TornoG", 'Int'>
    readonly ruedaSolicitudId: FieldRef<"TornoG", 'Int'>
    readonly ruedasFinalId: FieldRef<"TornoG", 'Int'>
    readonly torneroId: FieldRef<"TornoG", 'Int'>
    readonly estado: FieldRef<"TornoG", 'EstadoTornoG'>
    readonly cantidadRuedas: FieldRef<"TornoG", 'Int'>
    readonly ruedasTerminadas: FieldRef<"TornoG", 'Int'>
    readonly fechaInicio: FieldRef<"TornoG", 'DateTime'>
    readonly fechaFin: FieldRef<"TornoG", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TornoG findUnique
   */
  export type TornoGFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter, which TornoG to fetch.
     */
    where: TornoGWhereUniqueInput
  }

  /**
   * TornoG findUniqueOrThrow
   */
  export type TornoGFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter, which TornoG to fetch.
     */
    where: TornoGWhereUniqueInput
  }

  /**
   * TornoG findFirst
   */
  export type TornoGFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter, which TornoG to fetch.
     */
    where?: TornoGWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoGS to fetch.
     */
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TornoGS.
     */
    cursor?: TornoGWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoGS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoGS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TornoGS.
     */
    distinct?: TornoGScalarFieldEnum | TornoGScalarFieldEnum[]
  }

  /**
   * TornoG findFirstOrThrow
   */
  export type TornoGFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter, which TornoG to fetch.
     */
    where?: TornoGWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoGS to fetch.
     */
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TornoGS.
     */
    cursor?: TornoGWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoGS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoGS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TornoGS.
     */
    distinct?: TornoGScalarFieldEnum | TornoGScalarFieldEnum[]
  }

  /**
   * TornoG findMany
   */
  export type TornoGFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter, which TornoGS to fetch.
     */
    where?: TornoGWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoGS to fetch.
     */
    orderBy?: TornoGOrderByWithRelationInput | TornoGOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TornoGS.
     */
    cursor?: TornoGWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoGS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoGS.
     */
    skip?: number
    distinct?: TornoGScalarFieldEnum | TornoGScalarFieldEnum[]
  }

  /**
   * TornoG create
   */
  export type TornoGCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * The data needed to create a TornoG.
     */
    data: XOR<TornoGCreateInput, TornoGUncheckedCreateInput>
  }

  /**
   * TornoG createMany
   */
  export type TornoGCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TornoGS.
     */
    data: TornoGCreateManyInput | TornoGCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TornoG createManyAndReturn
   */
  export type TornoGCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * The data used to create many TornoGS.
     */
    data: TornoGCreateManyInput | TornoGCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TornoG update
   */
  export type TornoGUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * The data needed to update a TornoG.
     */
    data: XOR<TornoGUpdateInput, TornoGUncheckedUpdateInput>
    /**
     * Choose, which TornoG to update.
     */
    where: TornoGWhereUniqueInput
  }

  /**
   * TornoG updateMany
   */
  export type TornoGUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TornoGS.
     */
    data: XOR<TornoGUpdateManyMutationInput, TornoGUncheckedUpdateManyInput>
    /**
     * Filter which TornoGS to update
     */
    where?: TornoGWhereInput
    /**
     * Limit how many TornoGS to update.
     */
    limit?: number
  }

  /**
   * TornoG updateManyAndReturn
   */
  export type TornoGUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * The data used to update TornoGS.
     */
    data: XOR<TornoGUpdateManyMutationInput, TornoGUncheckedUpdateManyInput>
    /**
     * Filter which TornoGS to update
     */
    where?: TornoGWhereInput
    /**
     * Limit how many TornoGS to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TornoG upsert
   */
  export type TornoGUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * The filter to search for the TornoG to update in case it exists.
     */
    where: TornoGWhereUniqueInput
    /**
     * In case the TornoG found by the `where` argument doesn't exist, create a new TornoG with this data.
     */
    create: XOR<TornoGCreateInput, TornoGUncheckedCreateInput>
    /**
     * In case the TornoG was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TornoGUpdateInput, TornoGUncheckedUpdateInput>
  }

  /**
   * TornoG delete
   */
  export type TornoGDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
    /**
     * Filter which TornoG to delete.
     */
    where: TornoGWhereUniqueInput
  }

  /**
   * TornoG deleteMany
   */
  export type TornoGDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TornoGS to delete
     */
    where?: TornoGWhereInput
    /**
     * Limit how many TornoGS to delete.
     */
    limit?: number
  }

  /**
   * TornoG.rondaServicio
   */
  export type TornoG$rondaServicioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaServicio
     */
    select?: RondaServicioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaServicio
     */
    omit?: RondaServicioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaServicioInclude<ExtArgs> | null
    where?: RondaServicioWhereInput
  }

  /**
   * TornoG.ruedaSolicitud
   */
  export type TornoG$ruedaSolicitudArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedaSolicitud
     */
    select?: RuedaSolicitudSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedaSolicitud
     */
    omit?: RuedaSolicitudOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedaSolicitudInclude<ExtArgs> | null
    where?: RuedaSolicitudWhereInput
  }

  /**
   * TornoG.ruedasFinal
   */
  export type TornoG$ruedasFinalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuedasFinal
     */
    select?: RuedasFinalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RuedasFinal
     */
    omit?: RuedasFinalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuedasFinalInclude<ExtArgs> | null
    where?: RuedasFinalWhereInput
  }

  /**
   * TornoG.detalleRuedas
   */
  export type TornoG$detalleRuedasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    where?: TornoRuedaTrabajoWhereInput
    orderBy?: TornoRuedaTrabajoOrderByWithRelationInput | TornoRuedaTrabajoOrderByWithRelationInput[]
    cursor?: TornoRuedaTrabajoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TornoRuedaTrabajoScalarFieldEnum | TornoRuedaTrabajoScalarFieldEnum[]
  }

  /**
   * TornoG without action
   */
  export type TornoGDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoG
     */
    select?: TornoGSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoG
     */
    omit?: TornoGOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoGInclude<ExtArgs> | null
  }


  /**
   * Model TornoRuedaTrabajo
   */

  export type AggregateTornoRuedaTrabajo = {
    _count: TornoRuedaTrabajoCountAggregateOutputType | null
    _avg: TornoRuedaTrabajoAvgAggregateOutputType | null
    _sum: TornoRuedaTrabajoSumAggregateOutputType | null
    _min: TornoRuedaTrabajoMinAggregateOutputType | null
    _max: TornoRuedaTrabajoMaxAggregateOutputType | null
  }

  export type TornoRuedaTrabajoAvgAggregateOutputType = {
    id: number | null
    tornoGId: number | null
    posicion: number | null
    duracionSegundos: number | null
  }

  export type TornoRuedaTrabajoSumAggregateOutputType = {
    id: number | null
    tornoGId: number | null
    posicion: number | null
    duracionSegundos: number | null
  }

  export type TornoRuedaTrabajoMinAggregateOutputType = {
    id: number | null
    tornoGId: number | null
    lado: $Enums.LadoRueda | null
    posicion: number | null
    estado: $Enums.EstadoTornoRueda | null
    fechaInicio: Date | null
    fechaFin: Date | null
    duracionSegundos: number | null
  }

  export type TornoRuedaTrabajoMaxAggregateOutputType = {
    id: number | null
    tornoGId: number | null
    lado: $Enums.LadoRueda | null
    posicion: number | null
    estado: $Enums.EstadoTornoRueda | null
    fechaInicio: Date | null
    fechaFin: Date | null
    duracionSegundos: number | null
  }

  export type TornoRuedaTrabajoCountAggregateOutputType = {
    id: number
    tornoGId: number
    lado: number
    posicion: number
    estado: number
    fechaInicio: number
    fechaFin: number
    duracionSegundos: number
    _all: number
  }


  export type TornoRuedaTrabajoAvgAggregateInputType = {
    id?: true
    tornoGId?: true
    posicion?: true
    duracionSegundos?: true
  }

  export type TornoRuedaTrabajoSumAggregateInputType = {
    id?: true
    tornoGId?: true
    posicion?: true
    duracionSegundos?: true
  }

  export type TornoRuedaTrabajoMinAggregateInputType = {
    id?: true
    tornoGId?: true
    lado?: true
    posicion?: true
    estado?: true
    fechaInicio?: true
    fechaFin?: true
    duracionSegundos?: true
  }

  export type TornoRuedaTrabajoMaxAggregateInputType = {
    id?: true
    tornoGId?: true
    lado?: true
    posicion?: true
    estado?: true
    fechaInicio?: true
    fechaFin?: true
    duracionSegundos?: true
  }

  export type TornoRuedaTrabajoCountAggregateInputType = {
    id?: true
    tornoGId?: true
    lado?: true
    posicion?: true
    estado?: true
    fechaInicio?: true
    fechaFin?: true
    duracionSegundos?: true
    _all?: true
  }

  export type TornoRuedaTrabajoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TornoRuedaTrabajo to aggregate.
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoRuedaTrabajos to fetch.
     */
    orderBy?: TornoRuedaTrabajoOrderByWithRelationInput | TornoRuedaTrabajoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TornoRuedaTrabajoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoRuedaTrabajos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoRuedaTrabajos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TornoRuedaTrabajos
    **/
    _count?: true | TornoRuedaTrabajoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TornoRuedaTrabajoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TornoRuedaTrabajoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TornoRuedaTrabajoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TornoRuedaTrabajoMaxAggregateInputType
  }

  export type GetTornoRuedaTrabajoAggregateType<T extends TornoRuedaTrabajoAggregateArgs> = {
        [P in keyof T & keyof AggregateTornoRuedaTrabajo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTornoRuedaTrabajo[P]>
      : GetScalarType<T[P], AggregateTornoRuedaTrabajo[P]>
  }




  export type TornoRuedaTrabajoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TornoRuedaTrabajoWhereInput
    orderBy?: TornoRuedaTrabajoOrderByWithAggregationInput | TornoRuedaTrabajoOrderByWithAggregationInput[]
    by: TornoRuedaTrabajoScalarFieldEnum[] | TornoRuedaTrabajoScalarFieldEnum
    having?: TornoRuedaTrabajoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TornoRuedaTrabajoCountAggregateInputType | true
    _avg?: TornoRuedaTrabajoAvgAggregateInputType
    _sum?: TornoRuedaTrabajoSumAggregateInputType
    _min?: TornoRuedaTrabajoMinAggregateInputType
    _max?: TornoRuedaTrabajoMaxAggregateInputType
  }

  export type TornoRuedaTrabajoGroupByOutputType = {
    id: number
    tornoGId: number
    lado: $Enums.LadoRueda
    posicion: number
    estado: $Enums.EstadoTornoRueda
    fechaInicio: Date | null
    fechaFin: Date | null
    duracionSegundos: number | null
    _count: TornoRuedaTrabajoCountAggregateOutputType | null
    _avg: TornoRuedaTrabajoAvgAggregateOutputType | null
    _sum: TornoRuedaTrabajoSumAggregateOutputType | null
    _min: TornoRuedaTrabajoMinAggregateOutputType | null
    _max: TornoRuedaTrabajoMaxAggregateOutputType | null
  }

  type GetTornoRuedaTrabajoGroupByPayload<T extends TornoRuedaTrabajoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TornoRuedaTrabajoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TornoRuedaTrabajoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TornoRuedaTrabajoGroupByOutputType[P]>
            : GetScalarType<T[P], TornoRuedaTrabajoGroupByOutputType[P]>
        }
      >
    >


  export type TornoRuedaTrabajoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tornoGId?: boolean
    lado?: boolean
    posicion?: boolean
    estado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    duracionSegundos?: boolean
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tornoRuedaTrabajo"]>

  export type TornoRuedaTrabajoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tornoGId?: boolean
    lado?: boolean
    posicion?: boolean
    estado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    duracionSegundos?: boolean
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tornoRuedaTrabajo"]>

  export type TornoRuedaTrabajoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tornoGId?: boolean
    lado?: boolean
    posicion?: boolean
    estado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    duracionSegundos?: boolean
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tornoRuedaTrabajo"]>

  export type TornoRuedaTrabajoSelectScalar = {
    id?: boolean
    tornoGId?: boolean
    lado?: boolean
    posicion?: boolean
    estado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    duracionSegundos?: boolean
  }

  export type TornoRuedaTrabajoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "tornoGId" | "lado" | "posicion" | "estado" | "fechaInicio" | "fechaFin" | "duracionSegundos", ExtArgs["result"]["tornoRuedaTrabajo"]>
  export type TornoRuedaTrabajoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }
  export type TornoRuedaTrabajoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }
  export type TornoRuedaTrabajoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tornoG?: boolean | TornoGDefaultArgs<ExtArgs>
  }

  export type $TornoRuedaTrabajoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TornoRuedaTrabajo"
    objects: {
      tornoG: Prisma.$TornoGPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      tornoGId: number
      lado: $Enums.LadoRueda
      posicion: number
      estado: $Enums.EstadoTornoRueda
      fechaInicio: Date | null
      fechaFin: Date | null
      duracionSegundos: number | null
    }, ExtArgs["result"]["tornoRuedaTrabajo"]>
    composites: {}
  }

  type TornoRuedaTrabajoGetPayload<S extends boolean | null | undefined | TornoRuedaTrabajoDefaultArgs> = $Result.GetResult<Prisma.$TornoRuedaTrabajoPayload, S>

  type TornoRuedaTrabajoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TornoRuedaTrabajoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TornoRuedaTrabajoCountAggregateInputType | true
    }

  export interface TornoRuedaTrabajoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TornoRuedaTrabajo'], meta: { name: 'TornoRuedaTrabajo' } }
    /**
     * Find zero or one TornoRuedaTrabajo that matches the filter.
     * @param {TornoRuedaTrabajoFindUniqueArgs} args - Arguments to find a TornoRuedaTrabajo
     * @example
     * // Get one TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TornoRuedaTrabajoFindUniqueArgs>(args: SelectSubset<T, TornoRuedaTrabajoFindUniqueArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TornoRuedaTrabajo that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TornoRuedaTrabajoFindUniqueOrThrowArgs} args - Arguments to find a TornoRuedaTrabajo
     * @example
     * // Get one TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TornoRuedaTrabajoFindUniqueOrThrowArgs>(args: SelectSubset<T, TornoRuedaTrabajoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TornoRuedaTrabajo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoFindFirstArgs} args - Arguments to find a TornoRuedaTrabajo
     * @example
     * // Get one TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TornoRuedaTrabajoFindFirstArgs>(args?: SelectSubset<T, TornoRuedaTrabajoFindFirstArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TornoRuedaTrabajo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoFindFirstOrThrowArgs} args - Arguments to find a TornoRuedaTrabajo
     * @example
     * // Get one TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TornoRuedaTrabajoFindFirstOrThrowArgs>(args?: SelectSubset<T, TornoRuedaTrabajoFindFirstOrThrowArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TornoRuedaTrabajos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TornoRuedaTrabajos
     * const tornoRuedaTrabajos = await prisma.tornoRuedaTrabajo.findMany()
     * 
     * // Get first 10 TornoRuedaTrabajos
     * const tornoRuedaTrabajos = await prisma.tornoRuedaTrabajo.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tornoRuedaTrabajoWithIdOnly = await prisma.tornoRuedaTrabajo.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TornoRuedaTrabajoFindManyArgs>(args?: SelectSubset<T, TornoRuedaTrabajoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TornoRuedaTrabajo.
     * @param {TornoRuedaTrabajoCreateArgs} args - Arguments to create a TornoRuedaTrabajo.
     * @example
     * // Create one TornoRuedaTrabajo
     * const TornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.create({
     *   data: {
     *     // ... data to create a TornoRuedaTrabajo
     *   }
     * })
     * 
     */
    create<T extends TornoRuedaTrabajoCreateArgs>(args: SelectSubset<T, TornoRuedaTrabajoCreateArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TornoRuedaTrabajos.
     * @param {TornoRuedaTrabajoCreateManyArgs} args - Arguments to create many TornoRuedaTrabajos.
     * @example
     * // Create many TornoRuedaTrabajos
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TornoRuedaTrabajoCreateManyArgs>(args?: SelectSubset<T, TornoRuedaTrabajoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TornoRuedaTrabajos and returns the data saved in the database.
     * @param {TornoRuedaTrabajoCreateManyAndReturnArgs} args - Arguments to create many TornoRuedaTrabajos.
     * @example
     * // Create many TornoRuedaTrabajos
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TornoRuedaTrabajos and only return the `id`
     * const tornoRuedaTrabajoWithIdOnly = await prisma.tornoRuedaTrabajo.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TornoRuedaTrabajoCreateManyAndReturnArgs>(args?: SelectSubset<T, TornoRuedaTrabajoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TornoRuedaTrabajo.
     * @param {TornoRuedaTrabajoDeleteArgs} args - Arguments to delete one TornoRuedaTrabajo.
     * @example
     * // Delete one TornoRuedaTrabajo
     * const TornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.delete({
     *   where: {
     *     // ... filter to delete one TornoRuedaTrabajo
     *   }
     * })
     * 
     */
    delete<T extends TornoRuedaTrabajoDeleteArgs>(args: SelectSubset<T, TornoRuedaTrabajoDeleteArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TornoRuedaTrabajo.
     * @param {TornoRuedaTrabajoUpdateArgs} args - Arguments to update one TornoRuedaTrabajo.
     * @example
     * // Update one TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TornoRuedaTrabajoUpdateArgs>(args: SelectSubset<T, TornoRuedaTrabajoUpdateArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TornoRuedaTrabajos.
     * @param {TornoRuedaTrabajoDeleteManyArgs} args - Arguments to filter TornoRuedaTrabajos to delete.
     * @example
     * // Delete a few TornoRuedaTrabajos
     * const { count } = await prisma.tornoRuedaTrabajo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TornoRuedaTrabajoDeleteManyArgs>(args?: SelectSubset<T, TornoRuedaTrabajoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TornoRuedaTrabajos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TornoRuedaTrabajos
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TornoRuedaTrabajoUpdateManyArgs>(args: SelectSubset<T, TornoRuedaTrabajoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TornoRuedaTrabajos and returns the data updated in the database.
     * @param {TornoRuedaTrabajoUpdateManyAndReturnArgs} args - Arguments to update many TornoRuedaTrabajos.
     * @example
     * // Update many TornoRuedaTrabajos
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TornoRuedaTrabajos and only return the `id`
     * const tornoRuedaTrabajoWithIdOnly = await prisma.tornoRuedaTrabajo.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TornoRuedaTrabajoUpdateManyAndReturnArgs>(args: SelectSubset<T, TornoRuedaTrabajoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TornoRuedaTrabajo.
     * @param {TornoRuedaTrabajoUpsertArgs} args - Arguments to update or create a TornoRuedaTrabajo.
     * @example
     * // Update or create a TornoRuedaTrabajo
     * const tornoRuedaTrabajo = await prisma.tornoRuedaTrabajo.upsert({
     *   create: {
     *     // ... data to create a TornoRuedaTrabajo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TornoRuedaTrabajo we want to update
     *   }
     * })
     */
    upsert<T extends TornoRuedaTrabajoUpsertArgs>(args: SelectSubset<T, TornoRuedaTrabajoUpsertArgs<ExtArgs>>): Prisma__TornoRuedaTrabajoClient<$Result.GetResult<Prisma.$TornoRuedaTrabajoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TornoRuedaTrabajos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoCountArgs} args - Arguments to filter TornoRuedaTrabajos to count.
     * @example
     * // Count the number of TornoRuedaTrabajos
     * const count = await prisma.tornoRuedaTrabajo.count({
     *   where: {
     *     // ... the filter for the TornoRuedaTrabajos we want to count
     *   }
     * })
    **/
    count<T extends TornoRuedaTrabajoCountArgs>(
      args?: Subset<T, TornoRuedaTrabajoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TornoRuedaTrabajoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TornoRuedaTrabajo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TornoRuedaTrabajoAggregateArgs>(args: Subset<T, TornoRuedaTrabajoAggregateArgs>): Prisma.PrismaPromise<GetTornoRuedaTrabajoAggregateType<T>>

    /**
     * Group by TornoRuedaTrabajo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TornoRuedaTrabajoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TornoRuedaTrabajoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TornoRuedaTrabajoGroupByArgs['orderBy'] }
        : { orderBy?: TornoRuedaTrabajoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TornoRuedaTrabajoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTornoRuedaTrabajoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TornoRuedaTrabajo model
   */
  readonly fields: TornoRuedaTrabajoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TornoRuedaTrabajo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TornoRuedaTrabajoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tornoG<T extends TornoGDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TornoGDefaultArgs<ExtArgs>>): Prisma__TornoGClient<$Result.GetResult<Prisma.$TornoGPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TornoRuedaTrabajo model
   */
  interface TornoRuedaTrabajoFieldRefs {
    readonly id: FieldRef<"TornoRuedaTrabajo", 'Int'>
    readonly tornoGId: FieldRef<"TornoRuedaTrabajo", 'Int'>
    readonly lado: FieldRef<"TornoRuedaTrabajo", 'LadoRueda'>
    readonly posicion: FieldRef<"TornoRuedaTrabajo", 'Int'>
    readonly estado: FieldRef<"TornoRuedaTrabajo", 'EstadoTornoRueda'>
    readonly fechaInicio: FieldRef<"TornoRuedaTrabajo", 'DateTime'>
    readonly fechaFin: FieldRef<"TornoRuedaTrabajo", 'DateTime'>
    readonly duracionSegundos: FieldRef<"TornoRuedaTrabajo", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * TornoRuedaTrabajo findUnique
   */
  export type TornoRuedaTrabajoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter, which TornoRuedaTrabajo to fetch.
     */
    where: TornoRuedaTrabajoWhereUniqueInput
  }

  /**
   * TornoRuedaTrabajo findUniqueOrThrow
   */
  export type TornoRuedaTrabajoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter, which TornoRuedaTrabajo to fetch.
     */
    where: TornoRuedaTrabajoWhereUniqueInput
  }

  /**
   * TornoRuedaTrabajo findFirst
   */
  export type TornoRuedaTrabajoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter, which TornoRuedaTrabajo to fetch.
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoRuedaTrabajos to fetch.
     */
    orderBy?: TornoRuedaTrabajoOrderByWithRelationInput | TornoRuedaTrabajoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TornoRuedaTrabajos.
     */
    cursor?: TornoRuedaTrabajoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoRuedaTrabajos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoRuedaTrabajos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TornoRuedaTrabajos.
     */
    distinct?: TornoRuedaTrabajoScalarFieldEnum | TornoRuedaTrabajoScalarFieldEnum[]
  }

  /**
   * TornoRuedaTrabajo findFirstOrThrow
   */
  export type TornoRuedaTrabajoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter, which TornoRuedaTrabajo to fetch.
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoRuedaTrabajos to fetch.
     */
    orderBy?: TornoRuedaTrabajoOrderByWithRelationInput | TornoRuedaTrabajoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TornoRuedaTrabajos.
     */
    cursor?: TornoRuedaTrabajoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoRuedaTrabajos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoRuedaTrabajos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TornoRuedaTrabajos.
     */
    distinct?: TornoRuedaTrabajoScalarFieldEnum | TornoRuedaTrabajoScalarFieldEnum[]
  }

  /**
   * TornoRuedaTrabajo findMany
   */
  export type TornoRuedaTrabajoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter, which TornoRuedaTrabajos to fetch.
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TornoRuedaTrabajos to fetch.
     */
    orderBy?: TornoRuedaTrabajoOrderByWithRelationInput | TornoRuedaTrabajoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TornoRuedaTrabajos.
     */
    cursor?: TornoRuedaTrabajoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TornoRuedaTrabajos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TornoRuedaTrabajos.
     */
    skip?: number
    distinct?: TornoRuedaTrabajoScalarFieldEnum | TornoRuedaTrabajoScalarFieldEnum[]
  }

  /**
   * TornoRuedaTrabajo create
   */
  export type TornoRuedaTrabajoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * The data needed to create a TornoRuedaTrabajo.
     */
    data: XOR<TornoRuedaTrabajoCreateInput, TornoRuedaTrabajoUncheckedCreateInput>
  }

  /**
   * TornoRuedaTrabajo createMany
   */
  export type TornoRuedaTrabajoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TornoRuedaTrabajos.
     */
    data: TornoRuedaTrabajoCreateManyInput | TornoRuedaTrabajoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TornoRuedaTrabajo createManyAndReturn
   */
  export type TornoRuedaTrabajoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * The data used to create many TornoRuedaTrabajos.
     */
    data: TornoRuedaTrabajoCreateManyInput | TornoRuedaTrabajoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TornoRuedaTrabajo update
   */
  export type TornoRuedaTrabajoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * The data needed to update a TornoRuedaTrabajo.
     */
    data: XOR<TornoRuedaTrabajoUpdateInput, TornoRuedaTrabajoUncheckedUpdateInput>
    /**
     * Choose, which TornoRuedaTrabajo to update.
     */
    where: TornoRuedaTrabajoWhereUniqueInput
  }

  /**
   * TornoRuedaTrabajo updateMany
   */
  export type TornoRuedaTrabajoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TornoRuedaTrabajos.
     */
    data: XOR<TornoRuedaTrabajoUpdateManyMutationInput, TornoRuedaTrabajoUncheckedUpdateManyInput>
    /**
     * Filter which TornoRuedaTrabajos to update
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * Limit how many TornoRuedaTrabajos to update.
     */
    limit?: number
  }

  /**
   * TornoRuedaTrabajo updateManyAndReturn
   */
  export type TornoRuedaTrabajoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * The data used to update TornoRuedaTrabajos.
     */
    data: XOR<TornoRuedaTrabajoUpdateManyMutationInput, TornoRuedaTrabajoUncheckedUpdateManyInput>
    /**
     * Filter which TornoRuedaTrabajos to update
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * Limit how many TornoRuedaTrabajos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TornoRuedaTrabajo upsert
   */
  export type TornoRuedaTrabajoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * The filter to search for the TornoRuedaTrabajo to update in case it exists.
     */
    where: TornoRuedaTrabajoWhereUniqueInput
    /**
     * In case the TornoRuedaTrabajo found by the `where` argument doesn't exist, create a new TornoRuedaTrabajo with this data.
     */
    create: XOR<TornoRuedaTrabajoCreateInput, TornoRuedaTrabajoUncheckedCreateInput>
    /**
     * In case the TornoRuedaTrabajo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TornoRuedaTrabajoUpdateInput, TornoRuedaTrabajoUncheckedUpdateInput>
  }

  /**
   * TornoRuedaTrabajo delete
   */
  export type TornoRuedaTrabajoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
    /**
     * Filter which TornoRuedaTrabajo to delete.
     */
    where: TornoRuedaTrabajoWhereUniqueInput
  }

  /**
   * TornoRuedaTrabajo deleteMany
   */
  export type TornoRuedaTrabajoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TornoRuedaTrabajos to delete
     */
    where?: TornoRuedaTrabajoWhereInput
    /**
     * Limit how many TornoRuedaTrabajos to delete.
     */
    limit?: number
  }

  /**
   * TornoRuedaTrabajo without action
   */
  export type TornoRuedaTrabajoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TornoRuedaTrabajo
     */
    select?: TornoRuedaTrabajoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TornoRuedaTrabajo
     */
    omit?: TornoRuedaTrabajoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TornoRuedaTrabajoInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const RuedaSolicitudScalarFieldEnum: {
    id: 'id',
    movimientoId: 'movimientoId',
    l1: 'l1',
    l2: 'l2',
    l3: 'l3',
    l4: 'l4',
    l5: 'l5',
    l6: 'l6',
    r1: 'r1',
    r2: 'r2',
    r3: 'r3',
    r4: 'r4',
    r5: 'r5',
    r6: 'r6',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RuedaSolicitudScalarFieldEnum = (typeof RuedaSolicitudScalarFieldEnum)[keyof typeof RuedaSolicitudScalarFieldEnum]


  export const RuedasFinalScalarFieldEnum: {
    id: 'id',
    ruedaSolicitudId: 'ruedaSolicitudId',
    torneroId: 'torneroId',
    l1: 'l1',
    l2: 'l2',
    l3: 'l3',
    l4: 'l4',
    l5: 'l5',
    l6: 'l6',
    r1: 'r1',
    r2: 'r2',
    r3: 'r3',
    r4: 'r4',
    r5: 'r5',
    r6: 'r6',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RuedasFinalScalarFieldEnum = (typeof RuedasFinalScalarFieldEnum)[keyof typeof RuedasFinalScalarFieldEnum]


  export const RondaServicioScalarFieldEnum: {
    id: 'id',
    ruedaSolicitudId: 'ruedaSolicitudId',
    ruedasFinalId: 'ruedasFinalId',
    status: 'status',
    torneroId: 'torneroId',
    inicio: 'inicio',
    fin: 'fin',
    detenidoPorIncidenteId: 'detenidoPorIncidenteId',
    canceladoPorIncidenteId: 'canceladoPorIncidenteId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RondaServicioScalarFieldEnum = (typeof RondaServicioScalarFieldEnum)[keyof typeof RondaServicioScalarFieldEnum]


  export const NavaScalarFieldEnum: {
    id: 'id',
    localidadId: 'localidadId',
    cantidad: 'cantidad',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type NavaScalarFieldEnum = (typeof NavaScalarFieldEnum)[keyof typeof NavaScalarFieldEnum]


  export const CambioScalarFieldEnum: {
    id: 'id',
    localidadId: 'localidadId',
    numeroNavaja: 'numeroNavaja',
    createdAt: 'createdAt'
  };

  export type CambioScalarFieldEnum = (typeof CambioScalarFieldEnum)[keyof typeof CambioScalarFieldEnum]


  export const IncidenteTornoScalarFieldEnum: {
    id: 'id',
    tipoFalla: 'tipoFalla',
    status: 'status',
    resuelto: 'resuelto',
    comentario: 'comentario',
    creadoPorId: 'creadoPorId',
    atendidoPorId: 'atendidoPorId',
    imagen1: 'imagen1',
    imagen2: 'imagen2',
    imagen3: 'imagen3',
    fechaCreacion: 'fechaCreacion',
    fechaAtencion: 'fechaAtencion',
    fechaTerminacion: 'fechaTerminacion',
    fechaActualizacion: 'fechaActualizacion',
    ruedaSolicitudId: 'ruedaSolicitudId',
    rondaServicioId: 'rondaServicioId'
  };

  export type IncidenteTornoScalarFieldEnum = (typeof IncidenteTornoScalarFieldEnum)[keyof typeof IncidenteTornoScalarFieldEnum]


  export const IncidenteTornoHijoScalarFieldEnum: {
    id: 'id',
    incidenteTornoId: 'incidenteTornoId',
    status: 'status',
    resuelto: 'resuelto',
    comentario: 'comentario',
    imagen1: 'imagen1',
    imagen2: 'imagen2',
    imagen3: 'imagen3',
    fechaCreacion: 'fechaCreacion',
    fechaActualizacion: 'fechaActualizacion'
  };

  export type IncidenteTornoHijoScalarFieldEnum = (typeof IncidenteTornoHijoScalarFieldEnum)[keyof typeof IncidenteTornoHijoScalarFieldEnum]


  export const TornoGScalarFieldEnum: {
    id: 'id',
    rondaServicioId: 'rondaServicioId',
    ruedaSolicitudId: 'ruedaSolicitudId',
    ruedasFinalId: 'ruedasFinalId',
    torneroId: 'torneroId',
    estado: 'estado',
    cantidadRuedas: 'cantidadRuedas',
    ruedasTerminadas: 'ruedasTerminadas',
    fechaInicio: 'fechaInicio',
    fechaFin: 'fechaFin'
  };

  export type TornoGScalarFieldEnum = (typeof TornoGScalarFieldEnum)[keyof typeof TornoGScalarFieldEnum]


  export const TornoRuedaTrabajoScalarFieldEnum: {
    id: 'id',
    tornoGId: 'tornoGId',
    lado: 'lado',
    posicion: 'posicion',
    estado: 'estado',
    fechaInicio: 'fechaInicio',
    fechaFin: 'fechaFin',
    duracionSegundos: 'duracionSegundos'
  };

  export type TornoRuedaTrabajoScalarFieldEnum = (typeof TornoRuedaTrabajoScalarFieldEnum)[keyof typeof TornoRuedaTrabajoScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'EstadoRondaServicio'
   */
  export type EnumEstadoRondaServicioFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaServicio'>
    


  /**
   * Reference to a field of type 'EstadoRondaServicio[]'
   */
  export type ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaServicio[]'>
    


  /**
   * Reference to a field of type 'TipoFallaTorno'
   */
  export type EnumTipoFallaTornoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoFallaTorno'>
    


  /**
   * Reference to a field of type 'TipoFallaTorno[]'
   */
  export type ListEnumTipoFallaTornoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoFallaTorno[]'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTornoPadre'
   */
  export type EnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTornoPadre'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTornoPadre[]'
   */
  export type ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTornoPadre[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTornoHijo'
   */
  export type EnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTornoHijo'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTornoHijo[]'
   */
  export type ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTornoHijo[]'>
    


  /**
   * Reference to a field of type 'EstadoTornoG'
   */
  export type EnumEstadoTornoGFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoTornoG'>
    


  /**
   * Reference to a field of type 'EstadoTornoG[]'
   */
  export type ListEnumEstadoTornoGFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoTornoG[]'>
    


  /**
   * Reference to a field of type 'LadoRueda'
   */
  export type EnumLadoRuedaFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LadoRueda'>
    


  /**
   * Reference to a field of type 'LadoRueda[]'
   */
  export type ListEnumLadoRuedaFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LadoRueda[]'>
    


  /**
   * Reference to a field of type 'EstadoTornoRueda'
   */
  export type EnumEstadoTornoRuedaFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoTornoRueda'>
    


  /**
   * Reference to a field of type 'EstadoTornoRueda[]'
   */
  export type ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoTornoRueda[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type RuedaSolicitudWhereInput = {
    AND?: RuedaSolicitudWhereInput | RuedaSolicitudWhereInput[]
    OR?: RuedaSolicitudWhereInput[]
    NOT?: RuedaSolicitudWhereInput | RuedaSolicitudWhereInput[]
    id?: IntFilter<"RuedaSolicitud"> | number
    movimientoId?: IntFilter<"RuedaSolicitud"> | number
    l1?: StringFilter<"RuedaSolicitud"> | string
    l2?: StringFilter<"RuedaSolicitud"> | string
    l3?: StringFilter<"RuedaSolicitud"> | string
    l4?: StringFilter<"RuedaSolicitud"> | string
    l5?: StringFilter<"RuedaSolicitud"> | string
    l6?: StringFilter<"RuedaSolicitud"> | string
    r1?: StringFilter<"RuedaSolicitud"> | string
    r2?: StringFilter<"RuedaSolicitud"> | string
    r3?: StringFilter<"RuedaSolicitud"> | string
    r4?: StringFilter<"RuedaSolicitud"> | string
    r5?: StringFilter<"RuedaSolicitud"> | string
    r6?: StringFilter<"RuedaSolicitud"> | string
    createdAt?: DateTimeFilter<"RuedaSolicitud"> | Date | string
    updatedAt?: DateTimeFilter<"RuedaSolicitud"> | Date | string
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    tornoG?: TornoGListRelationFilter
    incidentes?: IncidenteTornoListRelationFilter
  }

  export type RuedaSolicitudOrderByWithRelationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ruedasFinal?: RuedasFinalOrderByWithRelationInput
    rondaServicio?: RondaServicioOrderByWithRelationInput
    tornoG?: TornoGOrderByRelationAggregateInput
    incidentes?: IncidenteTornoOrderByRelationAggregateInput
  }

  export type RuedaSolicitudWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: RuedaSolicitudWhereInput | RuedaSolicitudWhereInput[]
    OR?: RuedaSolicitudWhereInput[]
    NOT?: RuedaSolicitudWhereInput | RuedaSolicitudWhereInput[]
    movimientoId?: IntFilter<"RuedaSolicitud"> | number
    l1?: StringFilter<"RuedaSolicitud"> | string
    l2?: StringFilter<"RuedaSolicitud"> | string
    l3?: StringFilter<"RuedaSolicitud"> | string
    l4?: StringFilter<"RuedaSolicitud"> | string
    l5?: StringFilter<"RuedaSolicitud"> | string
    l6?: StringFilter<"RuedaSolicitud"> | string
    r1?: StringFilter<"RuedaSolicitud"> | string
    r2?: StringFilter<"RuedaSolicitud"> | string
    r3?: StringFilter<"RuedaSolicitud"> | string
    r4?: StringFilter<"RuedaSolicitud"> | string
    r5?: StringFilter<"RuedaSolicitud"> | string
    r6?: StringFilter<"RuedaSolicitud"> | string
    createdAt?: DateTimeFilter<"RuedaSolicitud"> | Date | string
    updatedAt?: DateTimeFilter<"RuedaSolicitud"> | Date | string
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    tornoG?: TornoGListRelationFilter
    incidentes?: IncidenteTornoListRelationFilter
  }, "id">

  export type RuedaSolicitudOrderByWithAggregationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RuedaSolicitudCountOrderByAggregateInput
    _avg?: RuedaSolicitudAvgOrderByAggregateInput
    _max?: RuedaSolicitudMaxOrderByAggregateInput
    _min?: RuedaSolicitudMinOrderByAggregateInput
    _sum?: RuedaSolicitudSumOrderByAggregateInput
  }

  export type RuedaSolicitudScalarWhereWithAggregatesInput = {
    AND?: RuedaSolicitudScalarWhereWithAggregatesInput | RuedaSolicitudScalarWhereWithAggregatesInput[]
    OR?: RuedaSolicitudScalarWhereWithAggregatesInput[]
    NOT?: RuedaSolicitudScalarWhereWithAggregatesInput | RuedaSolicitudScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"RuedaSolicitud"> | number
    movimientoId?: IntWithAggregatesFilter<"RuedaSolicitud"> | number
    l1?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    l2?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    l3?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    l4?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    l5?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    l6?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r1?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r2?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r3?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r4?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r5?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    r6?: StringWithAggregatesFilter<"RuedaSolicitud"> | string
    createdAt?: DateTimeWithAggregatesFilter<"RuedaSolicitud"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RuedaSolicitud"> | Date | string
  }

  export type RuedasFinalWhereInput = {
    AND?: RuedasFinalWhereInput | RuedasFinalWhereInput[]
    OR?: RuedasFinalWhereInput[]
    NOT?: RuedasFinalWhereInput | RuedasFinalWhereInput[]
    id?: IntFilter<"RuedasFinal"> | number
    ruedaSolicitudId?: IntFilter<"RuedasFinal"> | number
    torneroId?: IntFilter<"RuedasFinal"> | number
    l1?: StringFilter<"RuedasFinal"> | string
    l2?: StringFilter<"RuedasFinal"> | string
    l3?: StringFilter<"RuedasFinal"> | string
    l4?: StringFilter<"RuedasFinal"> | string
    l5?: StringFilter<"RuedasFinal"> | string
    l6?: StringFilter<"RuedasFinal"> | string
    r1?: StringFilter<"RuedasFinal"> | string
    r2?: StringFilter<"RuedasFinal"> | string
    r3?: StringFilter<"RuedasFinal"> | string
    r4?: StringFilter<"RuedasFinal"> | string
    r5?: StringFilter<"RuedasFinal"> | string
    r6?: StringFilter<"RuedasFinal"> | string
    createdAt?: DateTimeFilter<"RuedasFinal"> | Date | string
    updatedAt?: DateTimeFilter<"RuedasFinal"> | Date | string
    ruedaSolicitud?: XOR<RuedaSolicitudScalarRelationFilter, RuedaSolicitudWhereInput>
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    tornoG?: TornoGListRelationFilter
  }

  export type RuedasFinalOrderByWithRelationInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ruedaSolicitud?: RuedaSolicitudOrderByWithRelationInput
    rondaServicio?: RondaServicioOrderByWithRelationInput
    tornoG?: TornoGOrderByRelationAggregateInput
  }

  export type RuedasFinalWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    ruedaSolicitudId?: number
    AND?: RuedasFinalWhereInput | RuedasFinalWhereInput[]
    OR?: RuedasFinalWhereInput[]
    NOT?: RuedasFinalWhereInput | RuedasFinalWhereInput[]
    torneroId?: IntFilter<"RuedasFinal"> | number
    l1?: StringFilter<"RuedasFinal"> | string
    l2?: StringFilter<"RuedasFinal"> | string
    l3?: StringFilter<"RuedasFinal"> | string
    l4?: StringFilter<"RuedasFinal"> | string
    l5?: StringFilter<"RuedasFinal"> | string
    l6?: StringFilter<"RuedasFinal"> | string
    r1?: StringFilter<"RuedasFinal"> | string
    r2?: StringFilter<"RuedasFinal"> | string
    r3?: StringFilter<"RuedasFinal"> | string
    r4?: StringFilter<"RuedasFinal"> | string
    r5?: StringFilter<"RuedasFinal"> | string
    r6?: StringFilter<"RuedasFinal"> | string
    createdAt?: DateTimeFilter<"RuedasFinal"> | Date | string
    updatedAt?: DateTimeFilter<"RuedasFinal"> | Date | string
    ruedaSolicitud?: XOR<RuedaSolicitudScalarRelationFilter, RuedaSolicitudWhereInput>
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    tornoG?: TornoGListRelationFilter
  }, "id" | "ruedaSolicitudId">

  export type RuedasFinalOrderByWithAggregationInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RuedasFinalCountOrderByAggregateInput
    _avg?: RuedasFinalAvgOrderByAggregateInput
    _max?: RuedasFinalMaxOrderByAggregateInput
    _min?: RuedasFinalMinOrderByAggregateInput
    _sum?: RuedasFinalSumOrderByAggregateInput
  }

  export type RuedasFinalScalarWhereWithAggregatesInput = {
    AND?: RuedasFinalScalarWhereWithAggregatesInput | RuedasFinalScalarWhereWithAggregatesInput[]
    OR?: RuedasFinalScalarWhereWithAggregatesInput[]
    NOT?: RuedasFinalScalarWhereWithAggregatesInput | RuedasFinalScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"RuedasFinal"> | number
    ruedaSolicitudId?: IntWithAggregatesFilter<"RuedasFinal"> | number
    torneroId?: IntWithAggregatesFilter<"RuedasFinal"> | number
    l1?: StringWithAggregatesFilter<"RuedasFinal"> | string
    l2?: StringWithAggregatesFilter<"RuedasFinal"> | string
    l3?: StringWithAggregatesFilter<"RuedasFinal"> | string
    l4?: StringWithAggregatesFilter<"RuedasFinal"> | string
    l5?: StringWithAggregatesFilter<"RuedasFinal"> | string
    l6?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r1?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r2?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r3?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r4?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r5?: StringWithAggregatesFilter<"RuedasFinal"> | string
    r6?: StringWithAggregatesFilter<"RuedasFinal"> | string
    createdAt?: DateTimeWithAggregatesFilter<"RuedasFinal"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RuedasFinal"> | Date | string
  }

  export type RondaServicioWhereInput = {
    AND?: RondaServicioWhereInput | RondaServicioWhereInput[]
    OR?: RondaServicioWhereInput[]
    NOT?: RondaServicioWhereInput | RondaServicioWhereInput[]
    id?: IntFilter<"RondaServicio"> | number
    ruedaSolicitudId?: IntFilter<"RondaServicio"> | number
    ruedasFinalId?: IntNullableFilter<"RondaServicio"> | number | null
    status?: EnumEstadoRondaServicioFilter<"RondaServicio"> | $Enums.EstadoRondaServicio
    torneroId?: IntNullableFilter<"RondaServicio"> | number | null
    inicio?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    fin?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    detenidoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    canceladoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    createdAt?: DateTimeFilter<"RondaServicio"> | Date | string
    updatedAt?: DateTimeFilter<"RondaServicio"> | Date | string
    ruedaSolicitud?: XOR<RuedaSolicitudScalarRelationFilter, RuedaSolicitudWhereInput>
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    tornoG?: XOR<TornoGNullableScalarRelationFilter, TornoGWhereInput> | null
    incidentes?: IncidenteTornoListRelationFilter
    detenidoPorIncidente?: XOR<IncidenteTornoNullableScalarRelationFilter, IncidenteTornoWhereInput> | null
    canceladoPorIncidente?: XOR<IncidenteTornoNullableScalarRelationFilter, IncidenteTornoWhereInput> | null
  }

  export type RondaServicioOrderByWithRelationInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrderInput | SortOrder
    status?: SortOrder
    torneroId?: SortOrderInput | SortOrder
    inicio?: SortOrderInput | SortOrder
    fin?: SortOrderInput | SortOrder
    detenidoPorIncidenteId?: SortOrderInput | SortOrder
    canceladoPorIncidenteId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ruedaSolicitud?: RuedaSolicitudOrderByWithRelationInput
    ruedasFinal?: RuedasFinalOrderByWithRelationInput
    tornoG?: TornoGOrderByWithRelationInput
    incidentes?: IncidenteTornoOrderByRelationAggregateInput
    detenidoPorIncidente?: IncidenteTornoOrderByWithRelationInput
    canceladoPorIncidente?: IncidenteTornoOrderByWithRelationInput
  }

  export type RondaServicioWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    ruedaSolicitudId?: number
    ruedasFinalId?: number
    AND?: RondaServicioWhereInput | RondaServicioWhereInput[]
    OR?: RondaServicioWhereInput[]
    NOT?: RondaServicioWhereInput | RondaServicioWhereInput[]
    status?: EnumEstadoRondaServicioFilter<"RondaServicio"> | $Enums.EstadoRondaServicio
    torneroId?: IntNullableFilter<"RondaServicio"> | number | null
    inicio?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    fin?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    detenidoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    canceladoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    createdAt?: DateTimeFilter<"RondaServicio"> | Date | string
    updatedAt?: DateTimeFilter<"RondaServicio"> | Date | string
    ruedaSolicitud?: XOR<RuedaSolicitudScalarRelationFilter, RuedaSolicitudWhereInput>
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    tornoG?: XOR<TornoGNullableScalarRelationFilter, TornoGWhereInput> | null
    incidentes?: IncidenteTornoListRelationFilter
    detenidoPorIncidente?: XOR<IncidenteTornoNullableScalarRelationFilter, IncidenteTornoWhereInput> | null
    canceladoPorIncidente?: XOR<IncidenteTornoNullableScalarRelationFilter, IncidenteTornoWhereInput> | null
  }, "id" | "ruedaSolicitudId" | "ruedasFinalId">

  export type RondaServicioOrderByWithAggregationInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrderInput | SortOrder
    status?: SortOrder
    torneroId?: SortOrderInput | SortOrder
    inicio?: SortOrderInput | SortOrder
    fin?: SortOrderInput | SortOrder
    detenidoPorIncidenteId?: SortOrderInput | SortOrder
    canceladoPorIncidenteId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RondaServicioCountOrderByAggregateInput
    _avg?: RondaServicioAvgOrderByAggregateInput
    _max?: RondaServicioMaxOrderByAggregateInput
    _min?: RondaServicioMinOrderByAggregateInput
    _sum?: RondaServicioSumOrderByAggregateInput
  }

  export type RondaServicioScalarWhereWithAggregatesInput = {
    AND?: RondaServicioScalarWhereWithAggregatesInput | RondaServicioScalarWhereWithAggregatesInput[]
    OR?: RondaServicioScalarWhereWithAggregatesInput[]
    NOT?: RondaServicioScalarWhereWithAggregatesInput | RondaServicioScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"RondaServicio"> | number
    ruedaSolicitudId?: IntWithAggregatesFilter<"RondaServicio"> | number
    ruedasFinalId?: IntNullableWithAggregatesFilter<"RondaServicio"> | number | null
    status?: EnumEstadoRondaServicioWithAggregatesFilter<"RondaServicio"> | $Enums.EstadoRondaServicio
    torneroId?: IntNullableWithAggregatesFilter<"RondaServicio"> | number | null
    inicio?: DateTimeNullableWithAggregatesFilter<"RondaServicio"> | Date | string | null
    fin?: DateTimeNullableWithAggregatesFilter<"RondaServicio"> | Date | string | null
    detenidoPorIncidenteId?: IntNullableWithAggregatesFilter<"RondaServicio"> | number | null
    canceladoPorIncidenteId?: IntNullableWithAggregatesFilter<"RondaServicio"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"RondaServicio"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RondaServicio"> | Date | string
  }

  export type NavaWhereInput = {
    AND?: NavaWhereInput | NavaWhereInput[]
    OR?: NavaWhereInput[]
    NOT?: NavaWhereInput | NavaWhereInput[]
    id?: IntFilter<"Nava"> | number
    localidadId?: IntFilter<"Nava"> | number
    cantidad?: IntFilter<"Nava"> | number
    createdAt?: DateTimeFilter<"Nava"> | Date | string
    updatedAt?: DateTimeFilter<"Nava"> | Date | string
    cambios?: CambioListRelationFilter
  }

  export type NavaOrderByWithRelationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cambios?: CambioOrderByRelationAggregateInput
  }

  export type NavaWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    localidadId?: number
    AND?: NavaWhereInput | NavaWhereInput[]
    OR?: NavaWhereInput[]
    NOT?: NavaWhereInput | NavaWhereInput[]
    cantidad?: IntFilter<"Nava"> | number
    createdAt?: DateTimeFilter<"Nava"> | Date | string
    updatedAt?: DateTimeFilter<"Nava"> | Date | string
    cambios?: CambioListRelationFilter
  }, "id" | "localidadId">

  export type NavaOrderByWithAggregationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: NavaCountOrderByAggregateInput
    _avg?: NavaAvgOrderByAggregateInput
    _max?: NavaMaxOrderByAggregateInput
    _min?: NavaMinOrderByAggregateInput
    _sum?: NavaSumOrderByAggregateInput
  }

  export type NavaScalarWhereWithAggregatesInput = {
    AND?: NavaScalarWhereWithAggregatesInput | NavaScalarWhereWithAggregatesInput[]
    OR?: NavaScalarWhereWithAggregatesInput[]
    NOT?: NavaScalarWhereWithAggregatesInput | NavaScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Nava"> | number
    localidadId?: IntWithAggregatesFilter<"Nava"> | number
    cantidad?: IntWithAggregatesFilter<"Nava"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Nava"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Nava"> | Date | string
  }

  export type CambioWhereInput = {
    AND?: CambioWhereInput | CambioWhereInput[]
    OR?: CambioWhereInput[]
    NOT?: CambioWhereInput | CambioWhereInput[]
    id?: IntFilter<"Cambio"> | number
    localidadId?: IntFilter<"Cambio"> | number
    numeroNavaja?: IntFilter<"Cambio"> | number
    createdAt?: DateTimeFilter<"Cambio"> | Date | string
    nava?: XOR<NavaScalarRelationFilter, NavaWhereInput>
  }

  export type CambioOrderByWithRelationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
    createdAt?: SortOrder
    nava?: NavaOrderByWithRelationInput
  }

  export type CambioWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: CambioWhereInput | CambioWhereInput[]
    OR?: CambioWhereInput[]
    NOT?: CambioWhereInput | CambioWhereInput[]
    localidadId?: IntFilter<"Cambio"> | number
    numeroNavaja?: IntFilter<"Cambio"> | number
    createdAt?: DateTimeFilter<"Cambio"> | Date | string
    nava?: XOR<NavaScalarRelationFilter, NavaWhereInput>
  }, "id">

  export type CambioOrderByWithAggregationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
    createdAt?: SortOrder
    _count?: CambioCountOrderByAggregateInput
    _avg?: CambioAvgOrderByAggregateInput
    _max?: CambioMaxOrderByAggregateInput
    _min?: CambioMinOrderByAggregateInput
    _sum?: CambioSumOrderByAggregateInput
  }

  export type CambioScalarWhereWithAggregatesInput = {
    AND?: CambioScalarWhereWithAggregatesInput | CambioScalarWhereWithAggregatesInput[]
    OR?: CambioScalarWhereWithAggregatesInput[]
    NOT?: CambioScalarWhereWithAggregatesInput | CambioScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Cambio"> | number
    localidadId?: IntWithAggregatesFilter<"Cambio"> | number
    numeroNavaja?: IntWithAggregatesFilter<"Cambio"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Cambio"> | Date | string
  }

  export type IncidenteTornoWhereInput = {
    AND?: IncidenteTornoWhereInput | IncidenteTornoWhereInput[]
    OR?: IncidenteTornoWhereInput[]
    NOT?: IncidenteTornoWhereInput | IncidenteTornoWhereInput[]
    id?: IntFilter<"IncidenteTorno"> | number
    tipoFalla?: EnumTipoFallaTornoFilter<"IncidenteTorno"> | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFilter<"IncidenteTorno"> | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFilter<"IncidenteTorno"> | boolean
    comentario?: StringNullableFilter<"IncidenteTorno"> | string | null
    creadoPorId?: IntFilter<"IncidenteTorno"> | number
    atendidoPorId?: IntNullableFilter<"IncidenteTorno"> | number | null
    imagen1?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTorno"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    fechaAtencion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaTerminacion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaActualizacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    ruedaSolicitudId?: IntNullableFilter<"IncidenteTorno"> | number | null
    rondaServicioId?: IntNullableFilter<"IncidenteTorno"> | number | null
    ruedaSolicitud?: XOR<RuedaSolicitudNullableScalarRelationFilter, RuedaSolicitudWhereInput> | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    rondasDetenidas?: RondaServicioListRelationFilter
    rondasCanceladas?: RondaServicioListRelationFilter
    hijos?: IncidenteTornoHijoListRelationFilter
  }

  export type IncidenteTornoOrderByWithRelationInput = {
    id?: SortOrder
    tipoFalla?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrderInput | SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrderInput | SortOrder
    imagen1?: SortOrderInput | SortOrder
    imagen2?: SortOrderInput | SortOrder
    imagen3?: SortOrderInput | SortOrder
    fechaCreacion?: SortOrder
    fechaAtencion?: SortOrderInput | SortOrder
    fechaTerminacion?: SortOrderInput | SortOrder
    fechaActualizacion?: SortOrder
    ruedaSolicitudId?: SortOrderInput | SortOrder
    rondaServicioId?: SortOrderInput | SortOrder
    ruedaSolicitud?: RuedaSolicitudOrderByWithRelationInput
    rondaServicio?: RondaServicioOrderByWithRelationInput
    rondasDetenidas?: RondaServicioOrderByRelationAggregateInput
    rondasCanceladas?: RondaServicioOrderByRelationAggregateInput
    hijos?: IncidenteTornoHijoOrderByRelationAggregateInput
  }

  export type IncidenteTornoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: IncidenteTornoWhereInput | IncidenteTornoWhereInput[]
    OR?: IncidenteTornoWhereInput[]
    NOT?: IncidenteTornoWhereInput | IncidenteTornoWhereInput[]
    tipoFalla?: EnumTipoFallaTornoFilter<"IncidenteTorno"> | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFilter<"IncidenteTorno"> | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFilter<"IncidenteTorno"> | boolean
    comentario?: StringNullableFilter<"IncidenteTorno"> | string | null
    creadoPorId?: IntFilter<"IncidenteTorno"> | number
    atendidoPorId?: IntNullableFilter<"IncidenteTorno"> | number | null
    imagen1?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTorno"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    fechaAtencion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaTerminacion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaActualizacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    ruedaSolicitudId?: IntNullableFilter<"IncidenteTorno"> | number | null
    rondaServicioId?: IntNullableFilter<"IncidenteTorno"> | number | null
    ruedaSolicitud?: XOR<RuedaSolicitudNullableScalarRelationFilter, RuedaSolicitudWhereInput> | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    rondasDetenidas?: RondaServicioListRelationFilter
    rondasCanceladas?: RondaServicioListRelationFilter
    hijos?: IncidenteTornoHijoListRelationFilter
  }, "id">

  export type IncidenteTornoOrderByWithAggregationInput = {
    id?: SortOrder
    tipoFalla?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrderInput | SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrderInput | SortOrder
    imagen1?: SortOrderInput | SortOrder
    imagen2?: SortOrderInput | SortOrder
    imagen3?: SortOrderInput | SortOrder
    fechaCreacion?: SortOrder
    fechaAtencion?: SortOrderInput | SortOrder
    fechaTerminacion?: SortOrderInput | SortOrder
    fechaActualizacion?: SortOrder
    ruedaSolicitudId?: SortOrderInput | SortOrder
    rondaServicioId?: SortOrderInput | SortOrder
    _count?: IncidenteTornoCountOrderByAggregateInput
    _avg?: IncidenteTornoAvgOrderByAggregateInput
    _max?: IncidenteTornoMaxOrderByAggregateInput
    _min?: IncidenteTornoMinOrderByAggregateInput
    _sum?: IncidenteTornoSumOrderByAggregateInput
  }

  export type IncidenteTornoScalarWhereWithAggregatesInput = {
    AND?: IncidenteTornoScalarWhereWithAggregatesInput | IncidenteTornoScalarWhereWithAggregatesInput[]
    OR?: IncidenteTornoScalarWhereWithAggregatesInput[]
    NOT?: IncidenteTornoScalarWhereWithAggregatesInput | IncidenteTornoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"IncidenteTorno"> | number
    tipoFalla?: EnumTipoFallaTornoWithAggregatesFilter<"IncidenteTorno"> | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreWithAggregatesFilter<"IncidenteTorno"> | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolWithAggregatesFilter<"IncidenteTorno"> | boolean
    comentario?: StringNullableWithAggregatesFilter<"IncidenteTorno"> | string | null
    creadoPorId?: IntWithAggregatesFilter<"IncidenteTorno"> | number
    atendidoPorId?: IntNullableWithAggregatesFilter<"IncidenteTorno"> | number | null
    imagen1?: StringNullableWithAggregatesFilter<"IncidenteTorno"> | string | null
    imagen2?: StringNullableWithAggregatesFilter<"IncidenteTorno"> | string | null
    imagen3?: StringNullableWithAggregatesFilter<"IncidenteTorno"> | string | null
    fechaCreacion?: DateTimeWithAggregatesFilter<"IncidenteTorno"> | Date | string
    fechaAtencion?: DateTimeNullableWithAggregatesFilter<"IncidenteTorno"> | Date | string | null
    fechaTerminacion?: DateTimeNullableWithAggregatesFilter<"IncidenteTorno"> | Date | string | null
    fechaActualizacion?: DateTimeWithAggregatesFilter<"IncidenteTorno"> | Date | string
    ruedaSolicitudId?: IntNullableWithAggregatesFilter<"IncidenteTorno"> | number | null
    rondaServicioId?: IntNullableWithAggregatesFilter<"IncidenteTorno"> | number | null
  }

  export type IncidenteTornoHijoWhereInput = {
    AND?: IncidenteTornoHijoWhereInput | IncidenteTornoHijoWhereInput[]
    OR?: IncidenteTornoHijoWhereInput[]
    NOT?: IncidenteTornoHijoWhereInput | IncidenteTornoHijoWhereInput[]
    id?: IntFilter<"IncidenteTornoHijo"> | number
    incidenteTornoId?: IntFilter<"IncidenteTornoHijo"> | number
    status?: EnumEstadoIncidenteTornoHijoFilter<"IncidenteTornoHijo"> | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFilter<"IncidenteTornoHijo"> | boolean
    comentario?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen1?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
    fechaActualizacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
    incidenteTorno?: XOR<IncidenteTornoScalarRelationFilter, IncidenteTornoWhereInput>
  }

  export type IncidenteTornoHijoOrderByWithRelationInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrderInput | SortOrder
    imagen1?: SortOrderInput | SortOrder
    imagen2?: SortOrderInput | SortOrder
    imagen3?: SortOrderInput | SortOrder
    fechaCreacion?: SortOrder
    fechaActualizacion?: SortOrder
    incidenteTorno?: IncidenteTornoOrderByWithRelationInput
  }

  export type IncidenteTornoHijoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: IncidenteTornoHijoWhereInput | IncidenteTornoHijoWhereInput[]
    OR?: IncidenteTornoHijoWhereInput[]
    NOT?: IncidenteTornoHijoWhereInput | IncidenteTornoHijoWhereInput[]
    incidenteTornoId?: IntFilter<"IncidenteTornoHijo"> | number
    status?: EnumEstadoIncidenteTornoHijoFilter<"IncidenteTornoHijo"> | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFilter<"IncidenteTornoHijo"> | boolean
    comentario?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen1?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
    fechaActualizacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
    incidenteTorno?: XOR<IncidenteTornoScalarRelationFilter, IncidenteTornoWhereInput>
  }, "id">

  export type IncidenteTornoHijoOrderByWithAggregationInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrderInput | SortOrder
    imagen1?: SortOrderInput | SortOrder
    imagen2?: SortOrderInput | SortOrder
    imagen3?: SortOrderInput | SortOrder
    fechaCreacion?: SortOrder
    fechaActualizacion?: SortOrder
    _count?: IncidenteTornoHijoCountOrderByAggregateInput
    _avg?: IncidenteTornoHijoAvgOrderByAggregateInput
    _max?: IncidenteTornoHijoMaxOrderByAggregateInput
    _min?: IncidenteTornoHijoMinOrderByAggregateInput
    _sum?: IncidenteTornoHijoSumOrderByAggregateInput
  }

  export type IncidenteTornoHijoScalarWhereWithAggregatesInput = {
    AND?: IncidenteTornoHijoScalarWhereWithAggregatesInput | IncidenteTornoHijoScalarWhereWithAggregatesInput[]
    OR?: IncidenteTornoHijoScalarWhereWithAggregatesInput[]
    NOT?: IncidenteTornoHijoScalarWhereWithAggregatesInput | IncidenteTornoHijoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"IncidenteTornoHijo"> | number
    incidenteTornoId?: IntWithAggregatesFilter<"IncidenteTornoHijo"> | number
    status?: EnumEstadoIncidenteTornoHijoWithAggregatesFilter<"IncidenteTornoHijo"> | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolWithAggregatesFilter<"IncidenteTornoHijo"> | boolean
    comentario?: StringNullableWithAggregatesFilter<"IncidenteTornoHijo"> | string | null
    imagen1?: StringNullableWithAggregatesFilter<"IncidenteTornoHijo"> | string | null
    imagen2?: StringNullableWithAggregatesFilter<"IncidenteTornoHijo"> | string | null
    imagen3?: StringNullableWithAggregatesFilter<"IncidenteTornoHijo"> | string | null
    fechaCreacion?: DateTimeWithAggregatesFilter<"IncidenteTornoHijo"> | Date | string
    fechaActualizacion?: DateTimeWithAggregatesFilter<"IncidenteTornoHijo"> | Date | string
  }

  export type TornoGWhereInput = {
    AND?: TornoGWhereInput | TornoGWhereInput[]
    OR?: TornoGWhereInput[]
    NOT?: TornoGWhereInput | TornoGWhereInput[]
    id?: IntFilter<"TornoG"> | number
    rondaServicioId?: IntNullableFilter<"TornoG"> | number | null
    ruedaSolicitudId?: IntNullableFilter<"TornoG"> | number | null
    ruedasFinalId?: IntNullableFilter<"TornoG"> | number | null
    torneroId?: IntFilter<"TornoG"> | number
    estado?: EnumEstadoTornoGFilter<"TornoG"> | $Enums.EstadoTornoG
    cantidadRuedas?: IntFilter<"TornoG"> | number
    ruedasTerminadas?: IntFilter<"TornoG"> | number
    fechaInicio?: DateTimeNullableFilter<"TornoG"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoG"> | Date | string | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    ruedaSolicitud?: XOR<RuedaSolicitudNullableScalarRelationFilter, RuedaSolicitudWhereInput> | null
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    detalleRuedas?: TornoRuedaTrabajoListRelationFilter
  }

  export type TornoGOrderByWithRelationInput = {
    id?: SortOrder
    rondaServicioId?: SortOrderInput | SortOrder
    ruedaSolicitudId?: SortOrderInput | SortOrder
    ruedasFinalId?: SortOrderInput | SortOrder
    torneroId?: SortOrder
    estado?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    rondaServicio?: RondaServicioOrderByWithRelationInput
    ruedaSolicitud?: RuedaSolicitudOrderByWithRelationInput
    ruedasFinal?: RuedasFinalOrderByWithRelationInput
    detalleRuedas?: TornoRuedaTrabajoOrderByRelationAggregateInput
  }

  export type TornoGWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    rondaServicioId?: number
    AND?: TornoGWhereInput | TornoGWhereInput[]
    OR?: TornoGWhereInput[]
    NOT?: TornoGWhereInput | TornoGWhereInput[]
    ruedaSolicitudId?: IntNullableFilter<"TornoG"> | number | null
    ruedasFinalId?: IntNullableFilter<"TornoG"> | number | null
    torneroId?: IntFilter<"TornoG"> | number
    estado?: EnumEstadoTornoGFilter<"TornoG"> | $Enums.EstadoTornoG
    cantidadRuedas?: IntFilter<"TornoG"> | number
    ruedasTerminadas?: IntFilter<"TornoG"> | number
    fechaInicio?: DateTimeNullableFilter<"TornoG"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoG"> | Date | string | null
    rondaServicio?: XOR<RondaServicioNullableScalarRelationFilter, RondaServicioWhereInput> | null
    ruedaSolicitud?: XOR<RuedaSolicitudNullableScalarRelationFilter, RuedaSolicitudWhereInput> | null
    ruedasFinal?: XOR<RuedasFinalNullableScalarRelationFilter, RuedasFinalWhereInput> | null
    detalleRuedas?: TornoRuedaTrabajoListRelationFilter
  }, "id" | "rondaServicioId">

  export type TornoGOrderByWithAggregationInput = {
    id?: SortOrder
    rondaServicioId?: SortOrderInput | SortOrder
    ruedaSolicitudId?: SortOrderInput | SortOrder
    ruedasFinalId?: SortOrderInput | SortOrder
    torneroId?: SortOrder
    estado?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    _count?: TornoGCountOrderByAggregateInput
    _avg?: TornoGAvgOrderByAggregateInput
    _max?: TornoGMaxOrderByAggregateInput
    _min?: TornoGMinOrderByAggregateInput
    _sum?: TornoGSumOrderByAggregateInput
  }

  export type TornoGScalarWhereWithAggregatesInput = {
    AND?: TornoGScalarWhereWithAggregatesInput | TornoGScalarWhereWithAggregatesInput[]
    OR?: TornoGScalarWhereWithAggregatesInput[]
    NOT?: TornoGScalarWhereWithAggregatesInput | TornoGScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TornoG"> | number
    rondaServicioId?: IntNullableWithAggregatesFilter<"TornoG"> | number | null
    ruedaSolicitudId?: IntNullableWithAggregatesFilter<"TornoG"> | number | null
    ruedasFinalId?: IntNullableWithAggregatesFilter<"TornoG"> | number | null
    torneroId?: IntWithAggregatesFilter<"TornoG"> | number
    estado?: EnumEstadoTornoGWithAggregatesFilter<"TornoG"> | $Enums.EstadoTornoG
    cantidadRuedas?: IntWithAggregatesFilter<"TornoG"> | number
    ruedasTerminadas?: IntWithAggregatesFilter<"TornoG"> | number
    fechaInicio?: DateTimeNullableWithAggregatesFilter<"TornoG"> | Date | string | null
    fechaFin?: DateTimeNullableWithAggregatesFilter<"TornoG"> | Date | string | null
  }

  export type TornoRuedaTrabajoWhereInput = {
    AND?: TornoRuedaTrabajoWhereInput | TornoRuedaTrabajoWhereInput[]
    OR?: TornoRuedaTrabajoWhereInput[]
    NOT?: TornoRuedaTrabajoWhereInput | TornoRuedaTrabajoWhereInput[]
    id?: IntFilter<"TornoRuedaTrabajo"> | number
    tornoGId?: IntFilter<"TornoRuedaTrabajo"> | number
    lado?: EnumLadoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.LadoRueda
    posicion?: IntFilter<"TornoRuedaTrabajo"> | number
    estado?: EnumEstadoTornoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.EstadoTornoRueda
    fechaInicio?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    duracionSegundos?: IntNullableFilter<"TornoRuedaTrabajo"> | number | null
    tornoG?: XOR<TornoGScalarRelationFilter, TornoGWhereInput>
  }

  export type TornoRuedaTrabajoOrderByWithRelationInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    lado?: SortOrder
    posicion?: SortOrder
    estado?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    duracionSegundos?: SortOrderInput | SortOrder
    tornoG?: TornoGOrderByWithRelationInput
  }

  export type TornoRuedaTrabajoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    tornoGId_lado_posicion?: TornoRuedaTrabajoTornoGIdLadoPosicionCompoundUniqueInput
    AND?: TornoRuedaTrabajoWhereInput | TornoRuedaTrabajoWhereInput[]
    OR?: TornoRuedaTrabajoWhereInput[]
    NOT?: TornoRuedaTrabajoWhereInput | TornoRuedaTrabajoWhereInput[]
    tornoGId?: IntFilter<"TornoRuedaTrabajo"> | number
    lado?: EnumLadoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.LadoRueda
    posicion?: IntFilter<"TornoRuedaTrabajo"> | number
    estado?: EnumEstadoTornoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.EstadoTornoRueda
    fechaInicio?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    duracionSegundos?: IntNullableFilter<"TornoRuedaTrabajo"> | number | null
    tornoG?: XOR<TornoGScalarRelationFilter, TornoGWhereInput>
  }, "id" | "tornoGId_lado_posicion">

  export type TornoRuedaTrabajoOrderByWithAggregationInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    lado?: SortOrder
    posicion?: SortOrder
    estado?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    duracionSegundos?: SortOrderInput | SortOrder
    _count?: TornoRuedaTrabajoCountOrderByAggregateInput
    _avg?: TornoRuedaTrabajoAvgOrderByAggregateInput
    _max?: TornoRuedaTrabajoMaxOrderByAggregateInput
    _min?: TornoRuedaTrabajoMinOrderByAggregateInput
    _sum?: TornoRuedaTrabajoSumOrderByAggregateInput
  }

  export type TornoRuedaTrabajoScalarWhereWithAggregatesInput = {
    AND?: TornoRuedaTrabajoScalarWhereWithAggregatesInput | TornoRuedaTrabajoScalarWhereWithAggregatesInput[]
    OR?: TornoRuedaTrabajoScalarWhereWithAggregatesInput[]
    NOT?: TornoRuedaTrabajoScalarWhereWithAggregatesInput | TornoRuedaTrabajoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TornoRuedaTrabajo"> | number
    tornoGId?: IntWithAggregatesFilter<"TornoRuedaTrabajo"> | number
    lado?: EnumLadoRuedaWithAggregatesFilter<"TornoRuedaTrabajo"> | $Enums.LadoRueda
    posicion?: IntWithAggregatesFilter<"TornoRuedaTrabajo"> | number
    estado?: EnumEstadoTornoRuedaWithAggregatesFilter<"TornoRuedaTrabajo"> | $Enums.EstadoTornoRueda
    fechaInicio?: DateTimeNullableWithAggregatesFilter<"TornoRuedaTrabajo"> | Date | string | null
    fechaFin?: DateTimeNullableWithAggregatesFilter<"TornoRuedaTrabajo"> | Date | string | null
    duracionSegundos?: IntNullableWithAggregatesFilter<"TornoRuedaTrabajo"> | number | null
  }

  export type RuedaSolicitudCreateInput = {
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUncheckedCreateInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUpdateInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudCreateManyInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuedaSolicitudUpdateManyMutationInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuedaSolicitudUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuedasFinalCreateInput = {
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRuedasFinalInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedasFinalInput
    tornoG?: TornoGCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalUncheckedCreateInput = {
    id?: number
    ruedaSolicitudId: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedasFinalInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalUpdateInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRuedasFinalNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutRuedasFinalNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedasFinalNestedInput
  }

  export type RuedasFinalUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedasFinalNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedasFinalNestedInput
  }

  export type RuedasFinalCreateManyInput = {
    id?: number
    ruedaSolicitudId: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuedasFinalUpdateManyMutationInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuedasFinalUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaServicioCreateInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioUpdateInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type RondaServicioCreateManyInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaServicioUpdateManyMutationInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaServicioUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NavaCreateInput = {
    localidadId: number
    cantidad: number
    createdAt?: Date | string
    updatedAt?: Date | string
    cambios?: CambioCreateNestedManyWithoutNavaInput
  }

  export type NavaUncheckedCreateInput = {
    id?: number
    localidadId: number
    cantidad: number
    createdAt?: Date | string
    updatedAt?: Date | string
    cambios?: CambioUncheckedCreateNestedManyWithoutNavaInput
  }

  export type NavaUpdateInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cambios?: CambioUpdateManyWithoutNavaNestedInput
  }

  export type NavaUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cambios?: CambioUncheckedUpdateManyWithoutNavaNestedInput
  }

  export type NavaCreateManyInput = {
    id?: number
    localidadId: number
    cantidad: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NavaUpdateManyMutationInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NavaUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CambioCreateInput = {
    numeroNavaja: number
    createdAt?: Date | string
    nava: NavaCreateNestedOneWithoutCambiosInput
  }

  export type CambioUncheckedCreateInput = {
    id?: number
    localidadId: number
    numeroNavaja: number
    createdAt?: Date | string
  }

  export type CambioUpdateInput = {
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nava?: NavaUpdateOneRequiredWithoutCambiosNestedInput
  }

  export type CambioUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CambioCreateManyInput = {
    id?: number
    localidadId: number
    numeroNavaja: number
    createdAt?: Date | string
  }

  export type CambioUpdateManyMutationInput = {
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CambioUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoCreateInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutIncidentesInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutIncidentesInput
    rondasDetenidas?: RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUncheckedCreateInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondaServicioId?: number | null
    rondasDetenidas?: RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUpdateInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutIncidentesNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutIncidentesNestedInput
    rondasDetenidas?: RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasDetenidas?: RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoCreateManyInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondaServicioId?: number | null
  }

  export type IncidenteTornoUpdateManyMutationInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type IncidenteTornoHijoCreateInput = {
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
    incidenteTorno: IncidenteTornoCreateNestedOneWithoutHijosInput
  }

  export type IncidenteTornoHijoUncheckedCreateInput = {
    id?: number
    incidenteTornoId: number
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
  }

  export type IncidenteTornoHijoUpdateInput = {
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    incidenteTorno?: IncidenteTornoUpdateOneRequiredWithoutHijosNestedInput
  }

  export type IncidenteTornoHijoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    incidenteTornoId?: IntFieldUpdateOperationsInput | number
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoHijoCreateManyInput = {
    id?: number
    incidenteTornoId: number
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
  }

  export type IncidenteTornoHijoUpdateManyMutationInput = {
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoHijoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    incidenteTornoId?: IntFieldUpdateOperationsInput | number
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TornoGCreateInput = {
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    rondaServicio?: RondaServicioCreateNestedOneWithoutTornoGInput
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutTornoGInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutTornoGInput
    detalleRuedas?: TornoRuedaTrabajoCreateNestedManyWithoutTornoGInput
  }

  export type TornoGUncheckedCreateInput = {
    id?: number
    rondaServicioId?: number | null
    ruedaSolicitudId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedCreateNestedManyWithoutTornoGInput
  }

  export type TornoGUpdateInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rondaServicio?: RondaServicioUpdateOneWithoutTornoGNestedInput
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutTornoGNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutTornoGNestedInput
    detalleRuedas?: TornoRuedaTrabajoUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGCreateManyInput = {
    id?: number
    rondaServicioId?: number | null
    ruedaSolicitudId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
  }

  export type TornoGUpdateManyMutationInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TornoGUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TornoRuedaTrabajoCreateInput = {
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
    tornoG: TornoGCreateNestedOneWithoutDetalleRuedasInput
  }

  export type TornoRuedaTrabajoUncheckedCreateInput = {
    id?: number
    tornoGId: number
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
  }

  export type TornoRuedaTrabajoUpdateInput = {
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
    tornoG?: TornoGUpdateOneRequiredWithoutDetalleRuedasNestedInput
  }

  export type TornoRuedaTrabajoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    tornoGId?: IntFieldUpdateOperationsInput | number
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type TornoRuedaTrabajoCreateManyInput = {
    id?: number
    tornoGId: number
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
  }

  export type TornoRuedaTrabajoUpdateManyMutationInput = {
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type TornoRuedaTrabajoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    tornoGId?: IntFieldUpdateOperationsInput | number
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type RuedasFinalNullableScalarRelationFilter = {
    is?: RuedasFinalWhereInput | null
    isNot?: RuedasFinalWhereInput | null
  }

  export type RondaServicioNullableScalarRelationFilter = {
    is?: RondaServicioWhereInput | null
    isNot?: RondaServicioWhereInput | null
  }

  export type TornoGListRelationFilter = {
    every?: TornoGWhereInput
    some?: TornoGWhereInput
    none?: TornoGWhereInput
  }

  export type IncidenteTornoListRelationFilter = {
    every?: IncidenteTornoWhereInput
    some?: IncidenteTornoWhereInput
    none?: IncidenteTornoWhereInput
  }

  export type TornoGOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type IncidenteTornoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RuedaSolicitudCountOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedaSolicitudAvgOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
  }

  export type RuedaSolicitudMaxOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedaSolicitudMinOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedaSolicitudSumOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type RuedaSolicitudScalarRelationFilter = {
    is?: RuedaSolicitudWhereInput
    isNot?: RuedaSolicitudWhereInput
  }

  export type RuedasFinalCountOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedasFinalAvgOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
  }

  export type RuedasFinalMaxOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedasFinalMinOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
    l1?: SortOrder
    l2?: SortOrder
    l3?: SortOrder
    l4?: SortOrder
    l5?: SortOrder
    l6?: SortOrder
    r1?: SortOrder
    r2?: SortOrder
    r3?: SortOrder
    r4?: SortOrder
    r5?: SortOrder
    r6?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuedasFinalSumOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    torneroId?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumEstadoRondaServicioFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaServicio | EnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaServicioFilter<$PrismaModel> | $Enums.EstadoRondaServicio
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type TornoGNullableScalarRelationFilter = {
    is?: TornoGWhereInput | null
    isNot?: TornoGWhereInput | null
  }

  export type IncidenteTornoNullableScalarRelationFilter = {
    is?: IncidenteTornoWhereInput | null
    isNot?: IncidenteTornoWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RondaServicioCountOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    status?: SortOrder
    torneroId?: SortOrder
    inicio?: SortOrder
    fin?: SortOrder
    detenidoPorIncidenteId?: SortOrder
    canceladoPorIncidenteId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaServicioAvgOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    detenidoPorIncidenteId?: SortOrder
    canceladoPorIncidenteId?: SortOrder
  }

  export type RondaServicioMaxOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    status?: SortOrder
    torneroId?: SortOrder
    inicio?: SortOrder
    fin?: SortOrder
    detenidoPorIncidenteId?: SortOrder
    canceladoPorIncidenteId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaServicioMinOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    status?: SortOrder
    torneroId?: SortOrder
    inicio?: SortOrder
    fin?: SortOrder
    detenidoPorIncidenteId?: SortOrder
    canceladoPorIncidenteId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaServicioSumOrderByAggregateInput = {
    id?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    detenidoPorIncidenteId?: SortOrder
    canceladoPorIncidenteId?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumEstadoRondaServicioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaServicio | EnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaServicioWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaServicio
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaServicioFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaServicioFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type CambioListRelationFilter = {
    every?: CambioWhereInput
    some?: CambioWhereInput
    none?: CambioWhereInput
  }

  export type CambioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type NavaCountOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NavaAvgOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
  }

  export type NavaMaxOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NavaMinOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type NavaSumOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    cantidad?: SortOrder
  }

  export type NavaScalarRelationFilter = {
    is?: NavaWhereInput
    isNot?: NavaWhereInput
  }

  export type CambioCountOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
    createdAt?: SortOrder
  }

  export type CambioAvgOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
  }

  export type CambioMaxOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
    createdAt?: SortOrder
  }

  export type CambioMinOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
    createdAt?: SortOrder
  }

  export type CambioSumOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroNavaja?: SortOrder
  }

  export type EnumTipoFallaTornoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFallaTorno | EnumTipoFallaTornoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFallaTornoFilter<$PrismaModel> | $Enums.TipoFallaTorno
  }

  export type EnumEstadoIncidenteTornoPadreFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoPadre | EnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoPadre
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type RuedaSolicitudNullableScalarRelationFilter = {
    is?: RuedaSolicitudWhereInput | null
    isNot?: RuedaSolicitudWhereInput | null
  }

  export type RondaServicioListRelationFilter = {
    every?: RondaServicioWhereInput
    some?: RondaServicioWhereInput
    none?: RondaServicioWhereInput
  }

  export type IncidenteTornoHijoListRelationFilter = {
    every?: IncidenteTornoHijoWhereInput
    some?: IncidenteTornoHijoWhereInput
    none?: IncidenteTornoHijoWhereInput
  }

  export type RondaServicioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type IncidenteTornoHijoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type IncidenteTornoCountOrderByAggregateInput = {
    id?: SortOrder
    tipoFalla?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaAtencion?: SortOrder
    fechaTerminacion?: SortOrder
    fechaActualizacion?: SortOrder
    ruedaSolicitudId?: SortOrder
    rondaServicioId?: SortOrder
  }

  export type IncidenteTornoAvgOrderByAggregateInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrder
    ruedaSolicitudId?: SortOrder
    rondaServicioId?: SortOrder
  }

  export type IncidenteTornoMaxOrderByAggregateInput = {
    id?: SortOrder
    tipoFalla?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaAtencion?: SortOrder
    fechaTerminacion?: SortOrder
    fechaActualizacion?: SortOrder
    ruedaSolicitudId?: SortOrder
    rondaServicioId?: SortOrder
  }

  export type IncidenteTornoMinOrderByAggregateInput = {
    id?: SortOrder
    tipoFalla?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaAtencion?: SortOrder
    fechaTerminacion?: SortOrder
    fechaActualizacion?: SortOrder
    ruedaSolicitudId?: SortOrder
    rondaServicioId?: SortOrder
  }

  export type IncidenteTornoSumOrderByAggregateInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    atendidoPorId?: SortOrder
    ruedaSolicitudId?: SortOrder
    rondaServicioId?: SortOrder
  }

  export type EnumTipoFallaTornoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFallaTorno | EnumTipoFallaTornoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFallaTornoWithAggregatesFilter<$PrismaModel> | $Enums.TipoFallaTorno
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoFallaTornoFilter<$PrismaModel>
    _max?: NestedEnumTipoFallaTornoFilter<$PrismaModel>
  }

  export type EnumEstadoIncidenteTornoPadreWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoPadre | EnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoPadreWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoPadre
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumEstadoIncidenteTornoHijoFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoHijo | EnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoHijo
  }

  export type IncidenteTornoScalarRelationFilter = {
    is?: IncidenteTornoWhereInput
    isNot?: IncidenteTornoWhereInput
  }

  export type IncidenteTornoHijoCountOrderByAggregateInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaActualizacion?: SortOrder
  }

  export type IncidenteTornoHijoAvgOrderByAggregateInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
  }

  export type IncidenteTornoHijoMaxOrderByAggregateInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaActualizacion?: SortOrder
  }

  export type IncidenteTornoHijoMinOrderByAggregateInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
    status?: SortOrder
    resuelto?: SortOrder
    comentario?: SortOrder
    imagen1?: SortOrder
    imagen2?: SortOrder
    imagen3?: SortOrder
    fechaCreacion?: SortOrder
    fechaActualizacion?: SortOrder
  }

  export type IncidenteTornoHijoSumOrderByAggregateInput = {
    id?: SortOrder
    incidenteTornoId?: SortOrder
  }

  export type EnumEstadoIncidenteTornoHijoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoHijo | EnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoHijoWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoHijo
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel>
  }

  export type EnumEstadoTornoGFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoG | EnumEstadoTornoGFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoGFilter<$PrismaModel> | $Enums.EstadoTornoG
  }

  export type TornoRuedaTrabajoListRelationFilter = {
    every?: TornoRuedaTrabajoWhereInput
    some?: TornoRuedaTrabajoWhereInput
    none?: TornoRuedaTrabajoWhereInput
  }

  export type TornoRuedaTrabajoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TornoGCountOrderByAggregateInput = {
    id?: SortOrder
    rondaServicioId?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    estado?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
  }

  export type TornoGAvgOrderByAggregateInput = {
    id?: SortOrder
    rondaServicioId?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
  }

  export type TornoGMaxOrderByAggregateInput = {
    id?: SortOrder
    rondaServicioId?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    estado?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
  }

  export type TornoGMinOrderByAggregateInput = {
    id?: SortOrder
    rondaServicioId?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    estado?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
  }

  export type TornoGSumOrderByAggregateInput = {
    id?: SortOrder
    rondaServicioId?: SortOrder
    ruedaSolicitudId?: SortOrder
    ruedasFinalId?: SortOrder
    torneroId?: SortOrder
    cantidadRuedas?: SortOrder
    ruedasTerminadas?: SortOrder
  }

  export type EnumEstadoTornoGWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoG | EnumEstadoTornoGFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoGWithAggregatesFilter<$PrismaModel> | $Enums.EstadoTornoG
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoTornoGFilter<$PrismaModel>
    _max?: NestedEnumEstadoTornoGFilter<$PrismaModel>
  }

  export type EnumLadoRuedaFilter<$PrismaModel = never> = {
    equals?: $Enums.LadoRueda | EnumLadoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumLadoRuedaFilter<$PrismaModel> | $Enums.LadoRueda
  }

  export type EnumEstadoTornoRuedaFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoRueda | EnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel> | $Enums.EstadoTornoRueda
  }

  export type TornoGScalarRelationFilter = {
    is?: TornoGWhereInput
    isNot?: TornoGWhereInput
  }

  export type TornoRuedaTrabajoTornoGIdLadoPosicionCompoundUniqueInput = {
    tornoGId: number
    lado: $Enums.LadoRueda
    posicion: number
  }

  export type TornoRuedaTrabajoCountOrderByAggregateInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    lado?: SortOrder
    posicion?: SortOrder
    estado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    duracionSegundos?: SortOrder
  }

  export type TornoRuedaTrabajoAvgOrderByAggregateInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    posicion?: SortOrder
    duracionSegundos?: SortOrder
  }

  export type TornoRuedaTrabajoMaxOrderByAggregateInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    lado?: SortOrder
    posicion?: SortOrder
    estado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    duracionSegundos?: SortOrder
  }

  export type TornoRuedaTrabajoMinOrderByAggregateInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    lado?: SortOrder
    posicion?: SortOrder
    estado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    duracionSegundos?: SortOrder
  }

  export type TornoRuedaTrabajoSumOrderByAggregateInput = {
    id?: SortOrder
    tornoGId?: SortOrder
    posicion?: SortOrder
    duracionSegundos?: SortOrder
  }

  export type EnumLadoRuedaWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LadoRueda | EnumLadoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumLadoRuedaWithAggregatesFilter<$PrismaModel> | $Enums.LadoRueda
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLadoRuedaFilter<$PrismaModel>
    _max?: NestedEnumLadoRuedaFilter<$PrismaModel>
  }

  export type EnumEstadoTornoRuedaWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoRueda | EnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoRuedaWithAggregatesFilter<$PrismaModel> | $Enums.EstadoTornoRueda
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel>
    _max?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel>
  }

  export type RuedasFinalCreateNestedOneWithoutRuedaSolicitudInput = {
    create?: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRuedaSolicitudInput
    connect?: RuedasFinalWhereUniqueInput
  }

  export type RondaServicioCreateNestedOneWithoutRuedaSolicitudInput = {
    create?: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedaSolicitudInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type TornoGCreateNestedManyWithoutRuedaSolicitudInput = {
    create?: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput> | TornoGCreateWithoutRuedaSolicitudInput[] | TornoGUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedaSolicitudInput | TornoGCreateOrConnectWithoutRuedaSolicitudInput[]
    createMany?: TornoGCreateManyRuedaSolicitudInputEnvelope
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
  }

  export type IncidenteTornoCreateNestedManyWithoutRuedaSolicitudInput = {
    create?: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput> | IncidenteTornoCreateWithoutRuedaSolicitudInput[] | IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput | IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput[]
    createMany?: IncidenteTornoCreateManyRuedaSolicitudInputEnvelope
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
  }

  export type RuedasFinalUncheckedCreateNestedOneWithoutRuedaSolicitudInput = {
    create?: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRuedaSolicitudInput
    connect?: RuedasFinalWhereUniqueInput
  }

  export type RondaServicioUncheckedCreateNestedOneWithoutRuedaSolicitudInput = {
    create?: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedaSolicitudInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type TornoGUncheckedCreateNestedManyWithoutRuedaSolicitudInput = {
    create?: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput> | TornoGCreateWithoutRuedaSolicitudInput[] | TornoGUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedaSolicitudInput | TornoGCreateOrConnectWithoutRuedaSolicitudInput[]
    createMany?: TornoGCreateManyRuedaSolicitudInputEnvelope
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
  }

  export type IncidenteTornoUncheckedCreateNestedManyWithoutRuedaSolicitudInput = {
    create?: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput> | IncidenteTornoCreateWithoutRuedaSolicitudInput[] | IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput | IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput[]
    createMany?: IncidenteTornoCreateManyRuedaSolicitudInputEnvelope
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RuedasFinalUpdateOneWithoutRuedaSolicitudNestedInput = {
    create?: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRuedaSolicitudInput
    upsert?: RuedasFinalUpsertWithoutRuedaSolicitudInput
    disconnect?: RuedasFinalWhereInput | boolean
    delete?: RuedasFinalWhereInput | boolean
    connect?: RuedasFinalWhereUniqueInput
    update?: XOR<XOR<RuedasFinalUpdateToOneWithWhereWithoutRuedaSolicitudInput, RuedasFinalUpdateWithoutRuedaSolicitudInput>, RuedasFinalUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type RondaServicioUpdateOneWithoutRuedaSolicitudNestedInput = {
    create?: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedaSolicitudInput
    upsert?: RondaServicioUpsertWithoutRuedaSolicitudInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutRuedaSolicitudInput, RondaServicioUpdateWithoutRuedaSolicitudInput>, RondaServicioUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type TornoGUpdateManyWithoutRuedaSolicitudNestedInput = {
    create?: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput> | TornoGCreateWithoutRuedaSolicitudInput[] | TornoGUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedaSolicitudInput | TornoGCreateOrConnectWithoutRuedaSolicitudInput[]
    upsert?: TornoGUpsertWithWhereUniqueWithoutRuedaSolicitudInput | TornoGUpsertWithWhereUniqueWithoutRuedaSolicitudInput[]
    createMany?: TornoGCreateManyRuedaSolicitudInputEnvelope
    set?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    disconnect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    delete?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    update?: TornoGUpdateWithWhereUniqueWithoutRuedaSolicitudInput | TornoGUpdateWithWhereUniqueWithoutRuedaSolicitudInput[]
    updateMany?: TornoGUpdateManyWithWhereWithoutRuedaSolicitudInput | TornoGUpdateManyWithWhereWithoutRuedaSolicitudInput[]
    deleteMany?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
  }

  export type IncidenteTornoUpdateManyWithoutRuedaSolicitudNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput> | IncidenteTornoCreateWithoutRuedaSolicitudInput[] | IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput | IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput[]
    upsert?: IncidenteTornoUpsertWithWhereUniqueWithoutRuedaSolicitudInput | IncidenteTornoUpsertWithWhereUniqueWithoutRuedaSolicitudInput[]
    createMany?: IncidenteTornoCreateManyRuedaSolicitudInputEnvelope
    set?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    disconnect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    delete?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    update?: IncidenteTornoUpdateWithWhereUniqueWithoutRuedaSolicitudInput | IncidenteTornoUpdateWithWhereUniqueWithoutRuedaSolicitudInput[]
    updateMany?: IncidenteTornoUpdateManyWithWhereWithoutRuedaSolicitudInput | IncidenteTornoUpdateManyWithWhereWithoutRuedaSolicitudInput[]
    deleteMany?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
  }

  export type RuedasFinalUncheckedUpdateOneWithoutRuedaSolicitudNestedInput = {
    create?: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRuedaSolicitudInput
    upsert?: RuedasFinalUpsertWithoutRuedaSolicitudInput
    disconnect?: RuedasFinalWhereInput | boolean
    delete?: RuedasFinalWhereInput | boolean
    connect?: RuedasFinalWhereUniqueInput
    update?: XOR<XOR<RuedasFinalUpdateToOneWithWhereWithoutRuedaSolicitudInput, RuedasFinalUpdateWithoutRuedaSolicitudInput>, RuedasFinalUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type RondaServicioUncheckedUpdateOneWithoutRuedaSolicitudNestedInput = {
    create?: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedaSolicitudInput
    upsert?: RondaServicioUpsertWithoutRuedaSolicitudInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutRuedaSolicitudInput, RondaServicioUpdateWithoutRuedaSolicitudInput>, RondaServicioUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type TornoGUncheckedUpdateManyWithoutRuedaSolicitudNestedInput = {
    create?: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput> | TornoGCreateWithoutRuedaSolicitudInput[] | TornoGUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedaSolicitudInput | TornoGCreateOrConnectWithoutRuedaSolicitudInput[]
    upsert?: TornoGUpsertWithWhereUniqueWithoutRuedaSolicitudInput | TornoGUpsertWithWhereUniqueWithoutRuedaSolicitudInput[]
    createMany?: TornoGCreateManyRuedaSolicitudInputEnvelope
    set?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    disconnect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    delete?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    update?: TornoGUpdateWithWhereUniqueWithoutRuedaSolicitudInput | TornoGUpdateWithWhereUniqueWithoutRuedaSolicitudInput[]
    updateMany?: TornoGUpdateManyWithWhereWithoutRuedaSolicitudInput | TornoGUpdateManyWithWhereWithoutRuedaSolicitudInput[]
    deleteMany?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
  }

  export type IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput> | IncidenteTornoCreateWithoutRuedaSolicitudInput[] | IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput | IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput[]
    upsert?: IncidenteTornoUpsertWithWhereUniqueWithoutRuedaSolicitudInput | IncidenteTornoUpsertWithWhereUniqueWithoutRuedaSolicitudInput[]
    createMany?: IncidenteTornoCreateManyRuedaSolicitudInputEnvelope
    set?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    disconnect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    delete?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    update?: IncidenteTornoUpdateWithWhereUniqueWithoutRuedaSolicitudInput | IncidenteTornoUpdateWithWhereUniqueWithoutRuedaSolicitudInput[]
    updateMany?: IncidenteTornoUpdateManyWithWhereWithoutRuedaSolicitudInput | IncidenteTornoUpdateManyWithWhereWithoutRuedaSolicitudInput[]
    deleteMany?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
  }

  export type RuedaSolicitudCreateNestedOneWithoutRuedasFinalInput = {
    create?: XOR<RuedaSolicitudCreateWithoutRuedasFinalInput, RuedaSolicitudUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutRuedasFinalInput
    connect?: RuedaSolicitudWhereUniqueInput
  }

  export type RondaServicioCreateNestedOneWithoutRuedasFinalInput = {
    create?: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedasFinalInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type TornoGCreateNestedManyWithoutRuedasFinalInput = {
    create?: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput> | TornoGCreateWithoutRuedasFinalInput[] | TornoGUncheckedCreateWithoutRuedasFinalInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedasFinalInput | TornoGCreateOrConnectWithoutRuedasFinalInput[]
    createMany?: TornoGCreateManyRuedasFinalInputEnvelope
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
  }

  export type RondaServicioUncheckedCreateNestedOneWithoutRuedasFinalInput = {
    create?: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedasFinalInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type TornoGUncheckedCreateNestedManyWithoutRuedasFinalInput = {
    create?: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput> | TornoGCreateWithoutRuedasFinalInput[] | TornoGUncheckedCreateWithoutRuedasFinalInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedasFinalInput | TornoGCreateOrConnectWithoutRuedasFinalInput[]
    createMany?: TornoGCreateManyRuedasFinalInputEnvelope
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
  }

  export type RuedaSolicitudUpdateOneRequiredWithoutRuedasFinalNestedInput = {
    create?: XOR<RuedaSolicitudCreateWithoutRuedasFinalInput, RuedaSolicitudUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutRuedasFinalInput
    upsert?: RuedaSolicitudUpsertWithoutRuedasFinalInput
    connect?: RuedaSolicitudWhereUniqueInput
    update?: XOR<XOR<RuedaSolicitudUpdateToOneWithWhereWithoutRuedasFinalInput, RuedaSolicitudUpdateWithoutRuedasFinalInput>, RuedaSolicitudUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type RondaServicioUpdateOneWithoutRuedasFinalNestedInput = {
    create?: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedasFinalInput
    upsert?: RondaServicioUpsertWithoutRuedasFinalInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutRuedasFinalInput, RondaServicioUpdateWithoutRuedasFinalInput>, RondaServicioUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type TornoGUpdateManyWithoutRuedasFinalNestedInput = {
    create?: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput> | TornoGCreateWithoutRuedasFinalInput[] | TornoGUncheckedCreateWithoutRuedasFinalInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedasFinalInput | TornoGCreateOrConnectWithoutRuedasFinalInput[]
    upsert?: TornoGUpsertWithWhereUniqueWithoutRuedasFinalInput | TornoGUpsertWithWhereUniqueWithoutRuedasFinalInput[]
    createMany?: TornoGCreateManyRuedasFinalInputEnvelope
    set?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    disconnect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    delete?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    update?: TornoGUpdateWithWhereUniqueWithoutRuedasFinalInput | TornoGUpdateWithWhereUniqueWithoutRuedasFinalInput[]
    updateMany?: TornoGUpdateManyWithWhereWithoutRuedasFinalInput | TornoGUpdateManyWithWhereWithoutRuedasFinalInput[]
    deleteMany?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
  }

  export type RondaServicioUncheckedUpdateOneWithoutRuedasFinalNestedInput = {
    create?: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutRuedasFinalInput
    upsert?: RondaServicioUpsertWithoutRuedasFinalInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutRuedasFinalInput, RondaServicioUpdateWithoutRuedasFinalInput>, RondaServicioUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type TornoGUncheckedUpdateManyWithoutRuedasFinalNestedInput = {
    create?: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput> | TornoGCreateWithoutRuedasFinalInput[] | TornoGUncheckedCreateWithoutRuedasFinalInput[]
    connectOrCreate?: TornoGCreateOrConnectWithoutRuedasFinalInput | TornoGCreateOrConnectWithoutRuedasFinalInput[]
    upsert?: TornoGUpsertWithWhereUniqueWithoutRuedasFinalInput | TornoGUpsertWithWhereUniqueWithoutRuedasFinalInput[]
    createMany?: TornoGCreateManyRuedasFinalInputEnvelope
    set?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    disconnect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    delete?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    connect?: TornoGWhereUniqueInput | TornoGWhereUniqueInput[]
    update?: TornoGUpdateWithWhereUniqueWithoutRuedasFinalInput | TornoGUpdateWithWhereUniqueWithoutRuedasFinalInput[]
    updateMany?: TornoGUpdateManyWithWhereWithoutRuedasFinalInput | TornoGUpdateManyWithWhereWithoutRuedasFinalInput[]
    deleteMany?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
  }

  export type RuedaSolicitudCreateNestedOneWithoutRondaServicioInput = {
    create?: XOR<RuedaSolicitudCreateWithoutRondaServicioInput, RuedaSolicitudUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutRondaServicioInput
    connect?: RuedaSolicitudWhereUniqueInput
  }

  export type RuedasFinalCreateNestedOneWithoutRondaServicioInput = {
    create?: XOR<RuedasFinalCreateWithoutRondaServicioInput, RuedasFinalUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRondaServicioInput
    connect?: RuedasFinalWhereUniqueInput
  }

  export type TornoGCreateNestedOneWithoutRondaServicioInput = {
    create?: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutRondaServicioInput
    connect?: TornoGWhereUniqueInput
  }

  export type IncidenteTornoCreateNestedManyWithoutRondaServicioInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput> | IncidenteTornoCreateWithoutRondaServicioInput[] | IncidenteTornoUncheckedCreateWithoutRondaServicioInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondaServicioInput | IncidenteTornoCreateOrConnectWithoutRondaServicioInput[]
    createMany?: IncidenteTornoCreateManyRondaServicioInputEnvelope
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
  }

  export type IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondasDetenidasInput, IncidenteTornoUncheckedCreateWithoutRondasDetenidasInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondasDetenidasInput
    connect?: IncidenteTornoWhereUniqueInput
  }

  export type IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondasCanceladasInput, IncidenteTornoUncheckedCreateWithoutRondasCanceladasInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondasCanceladasInput
    connect?: IncidenteTornoWhereUniqueInput
  }

  export type TornoGUncheckedCreateNestedOneWithoutRondaServicioInput = {
    create?: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutRondaServicioInput
    connect?: TornoGWhereUniqueInput
  }

  export type IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput> | IncidenteTornoCreateWithoutRondaServicioInput[] | IncidenteTornoUncheckedCreateWithoutRondaServicioInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondaServicioInput | IncidenteTornoCreateOrConnectWithoutRondaServicioInput[]
    createMany?: IncidenteTornoCreateManyRondaServicioInputEnvelope
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
  }

  export type EnumEstadoRondaServicioFieldUpdateOperationsInput = {
    set?: $Enums.EstadoRondaServicio
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput = {
    create?: XOR<RuedaSolicitudCreateWithoutRondaServicioInput, RuedaSolicitudUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutRondaServicioInput
    upsert?: RuedaSolicitudUpsertWithoutRondaServicioInput
    connect?: RuedaSolicitudWhereUniqueInput
    update?: XOR<XOR<RuedaSolicitudUpdateToOneWithWhereWithoutRondaServicioInput, RuedaSolicitudUpdateWithoutRondaServicioInput>, RuedaSolicitudUncheckedUpdateWithoutRondaServicioInput>
  }

  export type RuedasFinalUpdateOneWithoutRondaServicioNestedInput = {
    create?: XOR<RuedasFinalCreateWithoutRondaServicioInput, RuedasFinalUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutRondaServicioInput
    upsert?: RuedasFinalUpsertWithoutRondaServicioInput
    disconnect?: RuedasFinalWhereInput | boolean
    delete?: RuedasFinalWhereInput | boolean
    connect?: RuedasFinalWhereUniqueInput
    update?: XOR<XOR<RuedasFinalUpdateToOneWithWhereWithoutRondaServicioInput, RuedasFinalUpdateWithoutRondaServicioInput>, RuedasFinalUncheckedUpdateWithoutRondaServicioInput>
  }

  export type TornoGUpdateOneWithoutRondaServicioNestedInput = {
    create?: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutRondaServicioInput
    upsert?: TornoGUpsertWithoutRondaServicioInput
    disconnect?: TornoGWhereInput | boolean
    delete?: TornoGWhereInput | boolean
    connect?: TornoGWhereUniqueInput
    update?: XOR<XOR<TornoGUpdateToOneWithWhereWithoutRondaServicioInput, TornoGUpdateWithoutRondaServicioInput>, TornoGUncheckedUpdateWithoutRondaServicioInput>
  }

  export type IncidenteTornoUpdateManyWithoutRondaServicioNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput> | IncidenteTornoCreateWithoutRondaServicioInput[] | IncidenteTornoUncheckedCreateWithoutRondaServicioInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondaServicioInput | IncidenteTornoCreateOrConnectWithoutRondaServicioInput[]
    upsert?: IncidenteTornoUpsertWithWhereUniqueWithoutRondaServicioInput | IncidenteTornoUpsertWithWhereUniqueWithoutRondaServicioInput[]
    createMany?: IncidenteTornoCreateManyRondaServicioInputEnvelope
    set?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    disconnect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    delete?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    update?: IncidenteTornoUpdateWithWhereUniqueWithoutRondaServicioInput | IncidenteTornoUpdateWithWhereUniqueWithoutRondaServicioInput[]
    updateMany?: IncidenteTornoUpdateManyWithWhereWithoutRondaServicioInput | IncidenteTornoUpdateManyWithWhereWithoutRondaServicioInput[]
    deleteMany?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
  }

  export type IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondasDetenidasInput, IncidenteTornoUncheckedCreateWithoutRondasDetenidasInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondasDetenidasInput
    upsert?: IncidenteTornoUpsertWithoutRondasDetenidasInput
    disconnect?: IncidenteTornoWhereInput | boolean
    delete?: IncidenteTornoWhereInput | boolean
    connect?: IncidenteTornoWhereUniqueInput
    update?: XOR<XOR<IncidenteTornoUpdateToOneWithWhereWithoutRondasDetenidasInput, IncidenteTornoUpdateWithoutRondasDetenidasInput>, IncidenteTornoUncheckedUpdateWithoutRondasDetenidasInput>
  }

  export type IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondasCanceladasInput, IncidenteTornoUncheckedCreateWithoutRondasCanceladasInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondasCanceladasInput
    upsert?: IncidenteTornoUpsertWithoutRondasCanceladasInput
    disconnect?: IncidenteTornoWhereInput | boolean
    delete?: IncidenteTornoWhereInput | boolean
    connect?: IncidenteTornoWhereUniqueInput
    update?: XOR<XOR<IncidenteTornoUpdateToOneWithWhereWithoutRondasCanceladasInput, IncidenteTornoUpdateWithoutRondasCanceladasInput>, IncidenteTornoUncheckedUpdateWithoutRondasCanceladasInput>
  }

  export type TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput = {
    create?: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutRondaServicioInput
    upsert?: TornoGUpsertWithoutRondaServicioInput
    disconnect?: TornoGWhereInput | boolean
    delete?: TornoGWhereInput | boolean
    connect?: TornoGWhereUniqueInput
    update?: XOR<XOR<TornoGUpdateToOneWithWhereWithoutRondaServicioInput, TornoGUpdateWithoutRondaServicioInput>, TornoGUncheckedUpdateWithoutRondaServicioInput>
  }

  export type IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput> | IncidenteTornoCreateWithoutRondaServicioInput[] | IncidenteTornoUncheckedCreateWithoutRondaServicioInput[]
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutRondaServicioInput | IncidenteTornoCreateOrConnectWithoutRondaServicioInput[]
    upsert?: IncidenteTornoUpsertWithWhereUniqueWithoutRondaServicioInput | IncidenteTornoUpsertWithWhereUniqueWithoutRondaServicioInput[]
    createMany?: IncidenteTornoCreateManyRondaServicioInputEnvelope
    set?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    disconnect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    delete?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    connect?: IncidenteTornoWhereUniqueInput | IncidenteTornoWhereUniqueInput[]
    update?: IncidenteTornoUpdateWithWhereUniqueWithoutRondaServicioInput | IncidenteTornoUpdateWithWhereUniqueWithoutRondaServicioInput[]
    updateMany?: IncidenteTornoUpdateManyWithWhereWithoutRondaServicioInput | IncidenteTornoUpdateManyWithWhereWithoutRondaServicioInput[]
    deleteMany?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
  }

  export type CambioCreateNestedManyWithoutNavaInput = {
    create?: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput> | CambioCreateWithoutNavaInput[] | CambioUncheckedCreateWithoutNavaInput[]
    connectOrCreate?: CambioCreateOrConnectWithoutNavaInput | CambioCreateOrConnectWithoutNavaInput[]
    createMany?: CambioCreateManyNavaInputEnvelope
    connect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
  }

  export type CambioUncheckedCreateNestedManyWithoutNavaInput = {
    create?: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput> | CambioCreateWithoutNavaInput[] | CambioUncheckedCreateWithoutNavaInput[]
    connectOrCreate?: CambioCreateOrConnectWithoutNavaInput | CambioCreateOrConnectWithoutNavaInput[]
    createMany?: CambioCreateManyNavaInputEnvelope
    connect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
  }

  export type CambioUpdateManyWithoutNavaNestedInput = {
    create?: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput> | CambioCreateWithoutNavaInput[] | CambioUncheckedCreateWithoutNavaInput[]
    connectOrCreate?: CambioCreateOrConnectWithoutNavaInput | CambioCreateOrConnectWithoutNavaInput[]
    upsert?: CambioUpsertWithWhereUniqueWithoutNavaInput | CambioUpsertWithWhereUniqueWithoutNavaInput[]
    createMany?: CambioCreateManyNavaInputEnvelope
    set?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    disconnect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    delete?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    connect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    update?: CambioUpdateWithWhereUniqueWithoutNavaInput | CambioUpdateWithWhereUniqueWithoutNavaInput[]
    updateMany?: CambioUpdateManyWithWhereWithoutNavaInput | CambioUpdateManyWithWhereWithoutNavaInput[]
    deleteMany?: CambioScalarWhereInput | CambioScalarWhereInput[]
  }

  export type CambioUncheckedUpdateManyWithoutNavaNestedInput = {
    create?: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput> | CambioCreateWithoutNavaInput[] | CambioUncheckedCreateWithoutNavaInput[]
    connectOrCreate?: CambioCreateOrConnectWithoutNavaInput | CambioCreateOrConnectWithoutNavaInput[]
    upsert?: CambioUpsertWithWhereUniqueWithoutNavaInput | CambioUpsertWithWhereUniqueWithoutNavaInput[]
    createMany?: CambioCreateManyNavaInputEnvelope
    set?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    disconnect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    delete?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    connect?: CambioWhereUniqueInput | CambioWhereUniqueInput[]
    update?: CambioUpdateWithWhereUniqueWithoutNavaInput | CambioUpdateWithWhereUniqueWithoutNavaInput[]
    updateMany?: CambioUpdateManyWithWhereWithoutNavaInput | CambioUpdateManyWithWhereWithoutNavaInput[]
    deleteMany?: CambioScalarWhereInput | CambioScalarWhereInput[]
  }

  export type NavaCreateNestedOneWithoutCambiosInput = {
    create?: XOR<NavaCreateWithoutCambiosInput, NavaUncheckedCreateWithoutCambiosInput>
    connectOrCreate?: NavaCreateOrConnectWithoutCambiosInput
    connect?: NavaWhereUniqueInput
  }

  export type NavaUpdateOneRequiredWithoutCambiosNestedInput = {
    create?: XOR<NavaCreateWithoutCambiosInput, NavaUncheckedCreateWithoutCambiosInput>
    connectOrCreate?: NavaCreateOrConnectWithoutCambiosInput
    upsert?: NavaUpsertWithoutCambiosInput
    connect?: NavaWhereUniqueInput
    update?: XOR<XOR<NavaUpdateToOneWithWhereWithoutCambiosInput, NavaUpdateWithoutCambiosInput>, NavaUncheckedUpdateWithoutCambiosInput>
  }

  export type RuedaSolicitudCreateNestedOneWithoutIncidentesInput = {
    create?: XOR<RuedaSolicitudCreateWithoutIncidentesInput, RuedaSolicitudUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutIncidentesInput
    connect?: RuedaSolicitudWhereUniqueInput
  }

  export type RondaServicioCreateNestedOneWithoutIncidentesInput = {
    create?: XOR<RondaServicioCreateWithoutIncidentesInput, RondaServicioUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutIncidentesInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput = {
    create?: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput> | RondaServicioCreateWithoutDetenidoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput | RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyDetenidoPorIncidenteInputEnvelope
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
  }

  export type RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput = {
    create?: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput> | RondaServicioCreateWithoutCanceladoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput | RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyCanceladoPorIncidenteInputEnvelope
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
  }

  export type IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput = {
    create?: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput> | IncidenteTornoHijoCreateWithoutIncidenteTornoInput[] | IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput[]
    connectOrCreate?: IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput | IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput[]
    createMany?: IncidenteTornoHijoCreateManyIncidenteTornoInputEnvelope
    connect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
  }

  export type RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput = {
    create?: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput> | RondaServicioCreateWithoutDetenidoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput | RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyDetenidoPorIncidenteInputEnvelope
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
  }

  export type RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput = {
    create?: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput> | RondaServicioCreateWithoutCanceladoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput | RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyCanceladoPorIncidenteInputEnvelope
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
  }

  export type IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput = {
    create?: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput> | IncidenteTornoHijoCreateWithoutIncidenteTornoInput[] | IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput[]
    connectOrCreate?: IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput | IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput[]
    createMany?: IncidenteTornoHijoCreateManyIncidenteTornoInputEnvelope
    connect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
  }

  export type EnumTipoFallaTornoFieldUpdateOperationsInput = {
    set?: $Enums.TipoFallaTorno
  }

  export type EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput = {
    set?: $Enums.EstadoIncidenteTornoPadre
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type RuedaSolicitudUpdateOneWithoutIncidentesNestedInput = {
    create?: XOR<RuedaSolicitudCreateWithoutIncidentesInput, RuedaSolicitudUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutIncidentesInput
    upsert?: RuedaSolicitudUpsertWithoutIncidentesInput
    disconnect?: RuedaSolicitudWhereInput | boolean
    delete?: RuedaSolicitudWhereInput | boolean
    connect?: RuedaSolicitudWhereUniqueInput
    update?: XOR<XOR<RuedaSolicitudUpdateToOneWithWhereWithoutIncidentesInput, RuedaSolicitudUpdateWithoutIncidentesInput>, RuedaSolicitudUncheckedUpdateWithoutIncidentesInput>
  }

  export type RondaServicioUpdateOneWithoutIncidentesNestedInput = {
    create?: XOR<RondaServicioCreateWithoutIncidentesInput, RondaServicioUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutIncidentesInput
    upsert?: RondaServicioUpsertWithoutIncidentesInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutIncidentesInput, RondaServicioUpdateWithoutIncidentesInput>, RondaServicioUncheckedUpdateWithoutIncidentesInput>
  }

  export type RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput = {
    create?: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput> | RondaServicioCreateWithoutDetenidoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput | RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput[]
    upsert?: RondaServicioUpsertWithWhereUniqueWithoutDetenidoPorIncidenteInput | RondaServicioUpsertWithWhereUniqueWithoutDetenidoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyDetenidoPorIncidenteInputEnvelope
    set?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    disconnect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    delete?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    update?: RondaServicioUpdateWithWhereUniqueWithoutDetenidoPorIncidenteInput | RondaServicioUpdateWithWhereUniqueWithoutDetenidoPorIncidenteInput[]
    updateMany?: RondaServicioUpdateManyWithWhereWithoutDetenidoPorIncidenteInput | RondaServicioUpdateManyWithWhereWithoutDetenidoPorIncidenteInput[]
    deleteMany?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
  }

  export type RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput = {
    create?: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput> | RondaServicioCreateWithoutCanceladoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput | RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput[]
    upsert?: RondaServicioUpsertWithWhereUniqueWithoutCanceladoPorIncidenteInput | RondaServicioUpsertWithWhereUniqueWithoutCanceladoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyCanceladoPorIncidenteInputEnvelope
    set?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    disconnect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    delete?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    update?: RondaServicioUpdateWithWhereUniqueWithoutCanceladoPorIncidenteInput | RondaServicioUpdateWithWhereUniqueWithoutCanceladoPorIncidenteInput[]
    updateMany?: RondaServicioUpdateManyWithWhereWithoutCanceladoPorIncidenteInput | RondaServicioUpdateManyWithWhereWithoutCanceladoPorIncidenteInput[]
    deleteMany?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
  }

  export type IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput = {
    create?: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput> | IncidenteTornoHijoCreateWithoutIncidenteTornoInput[] | IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput[]
    connectOrCreate?: IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput | IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput[]
    upsert?: IncidenteTornoHijoUpsertWithWhereUniqueWithoutIncidenteTornoInput | IncidenteTornoHijoUpsertWithWhereUniqueWithoutIncidenteTornoInput[]
    createMany?: IncidenteTornoHijoCreateManyIncidenteTornoInputEnvelope
    set?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    disconnect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    delete?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    connect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    update?: IncidenteTornoHijoUpdateWithWhereUniqueWithoutIncidenteTornoInput | IncidenteTornoHijoUpdateWithWhereUniqueWithoutIncidenteTornoInput[]
    updateMany?: IncidenteTornoHijoUpdateManyWithWhereWithoutIncidenteTornoInput | IncidenteTornoHijoUpdateManyWithWhereWithoutIncidenteTornoInput[]
    deleteMany?: IncidenteTornoHijoScalarWhereInput | IncidenteTornoHijoScalarWhereInput[]
  }

  export type RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput = {
    create?: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput> | RondaServicioCreateWithoutDetenidoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput | RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput[]
    upsert?: RondaServicioUpsertWithWhereUniqueWithoutDetenidoPorIncidenteInput | RondaServicioUpsertWithWhereUniqueWithoutDetenidoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyDetenidoPorIncidenteInputEnvelope
    set?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    disconnect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    delete?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    update?: RondaServicioUpdateWithWhereUniqueWithoutDetenidoPorIncidenteInput | RondaServicioUpdateWithWhereUniqueWithoutDetenidoPorIncidenteInput[]
    updateMany?: RondaServicioUpdateManyWithWhereWithoutDetenidoPorIncidenteInput | RondaServicioUpdateManyWithWhereWithoutDetenidoPorIncidenteInput[]
    deleteMany?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
  }

  export type RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput = {
    create?: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput> | RondaServicioCreateWithoutCanceladoPorIncidenteInput[] | RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput[]
    connectOrCreate?: RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput | RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput[]
    upsert?: RondaServicioUpsertWithWhereUniqueWithoutCanceladoPorIncidenteInput | RondaServicioUpsertWithWhereUniqueWithoutCanceladoPorIncidenteInput[]
    createMany?: RondaServicioCreateManyCanceladoPorIncidenteInputEnvelope
    set?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    disconnect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    delete?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    connect?: RondaServicioWhereUniqueInput | RondaServicioWhereUniqueInput[]
    update?: RondaServicioUpdateWithWhereUniqueWithoutCanceladoPorIncidenteInput | RondaServicioUpdateWithWhereUniqueWithoutCanceladoPorIncidenteInput[]
    updateMany?: RondaServicioUpdateManyWithWhereWithoutCanceladoPorIncidenteInput | RondaServicioUpdateManyWithWhereWithoutCanceladoPorIncidenteInput[]
    deleteMany?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
  }

  export type IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput = {
    create?: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput> | IncidenteTornoHijoCreateWithoutIncidenteTornoInput[] | IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput[]
    connectOrCreate?: IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput | IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput[]
    upsert?: IncidenteTornoHijoUpsertWithWhereUniqueWithoutIncidenteTornoInput | IncidenteTornoHijoUpsertWithWhereUniqueWithoutIncidenteTornoInput[]
    createMany?: IncidenteTornoHijoCreateManyIncidenteTornoInputEnvelope
    set?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    disconnect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    delete?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    connect?: IncidenteTornoHijoWhereUniqueInput | IncidenteTornoHijoWhereUniqueInput[]
    update?: IncidenteTornoHijoUpdateWithWhereUniqueWithoutIncidenteTornoInput | IncidenteTornoHijoUpdateWithWhereUniqueWithoutIncidenteTornoInput[]
    updateMany?: IncidenteTornoHijoUpdateManyWithWhereWithoutIncidenteTornoInput | IncidenteTornoHijoUpdateManyWithWhereWithoutIncidenteTornoInput[]
    deleteMany?: IncidenteTornoHijoScalarWhereInput | IncidenteTornoHijoScalarWhereInput[]
  }

  export type IncidenteTornoCreateNestedOneWithoutHijosInput = {
    create?: XOR<IncidenteTornoCreateWithoutHijosInput, IncidenteTornoUncheckedCreateWithoutHijosInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutHijosInput
    connect?: IncidenteTornoWhereUniqueInput
  }

  export type EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput = {
    set?: $Enums.EstadoIncidenteTornoHijo
  }

  export type IncidenteTornoUpdateOneRequiredWithoutHijosNestedInput = {
    create?: XOR<IncidenteTornoCreateWithoutHijosInput, IncidenteTornoUncheckedCreateWithoutHijosInput>
    connectOrCreate?: IncidenteTornoCreateOrConnectWithoutHijosInput
    upsert?: IncidenteTornoUpsertWithoutHijosInput
    connect?: IncidenteTornoWhereUniqueInput
    update?: XOR<XOR<IncidenteTornoUpdateToOneWithWhereWithoutHijosInput, IncidenteTornoUpdateWithoutHijosInput>, IncidenteTornoUncheckedUpdateWithoutHijosInput>
  }

  export type RondaServicioCreateNestedOneWithoutTornoGInput = {
    create?: XOR<RondaServicioCreateWithoutTornoGInput, RondaServicioUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutTornoGInput
    connect?: RondaServicioWhereUniqueInput
  }

  export type RuedaSolicitudCreateNestedOneWithoutTornoGInput = {
    create?: XOR<RuedaSolicitudCreateWithoutTornoGInput, RuedaSolicitudUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutTornoGInput
    connect?: RuedaSolicitudWhereUniqueInput
  }

  export type RuedasFinalCreateNestedOneWithoutTornoGInput = {
    create?: XOR<RuedasFinalCreateWithoutTornoGInput, RuedasFinalUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutTornoGInput
    connect?: RuedasFinalWhereUniqueInput
  }

  export type TornoRuedaTrabajoCreateNestedManyWithoutTornoGInput = {
    create?: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput> | TornoRuedaTrabajoCreateWithoutTornoGInput[] | TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput[]
    connectOrCreate?: TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput | TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput[]
    createMany?: TornoRuedaTrabajoCreateManyTornoGInputEnvelope
    connect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
  }

  export type TornoRuedaTrabajoUncheckedCreateNestedManyWithoutTornoGInput = {
    create?: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput> | TornoRuedaTrabajoCreateWithoutTornoGInput[] | TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput[]
    connectOrCreate?: TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput | TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput[]
    createMany?: TornoRuedaTrabajoCreateManyTornoGInputEnvelope
    connect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
  }

  export type EnumEstadoTornoGFieldUpdateOperationsInput = {
    set?: $Enums.EstadoTornoG
  }

  export type RondaServicioUpdateOneWithoutTornoGNestedInput = {
    create?: XOR<RondaServicioCreateWithoutTornoGInput, RondaServicioUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RondaServicioCreateOrConnectWithoutTornoGInput
    upsert?: RondaServicioUpsertWithoutTornoGInput
    disconnect?: RondaServicioWhereInput | boolean
    delete?: RondaServicioWhereInput | boolean
    connect?: RondaServicioWhereUniqueInput
    update?: XOR<XOR<RondaServicioUpdateToOneWithWhereWithoutTornoGInput, RondaServicioUpdateWithoutTornoGInput>, RondaServicioUncheckedUpdateWithoutTornoGInput>
  }

  export type RuedaSolicitudUpdateOneWithoutTornoGNestedInput = {
    create?: XOR<RuedaSolicitudCreateWithoutTornoGInput, RuedaSolicitudUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RuedaSolicitudCreateOrConnectWithoutTornoGInput
    upsert?: RuedaSolicitudUpsertWithoutTornoGInput
    disconnect?: RuedaSolicitudWhereInput | boolean
    delete?: RuedaSolicitudWhereInput | boolean
    connect?: RuedaSolicitudWhereUniqueInput
    update?: XOR<XOR<RuedaSolicitudUpdateToOneWithWhereWithoutTornoGInput, RuedaSolicitudUpdateWithoutTornoGInput>, RuedaSolicitudUncheckedUpdateWithoutTornoGInput>
  }

  export type RuedasFinalUpdateOneWithoutTornoGNestedInput = {
    create?: XOR<RuedasFinalCreateWithoutTornoGInput, RuedasFinalUncheckedCreateWithoutTornoGInput>
    connectOrCreate?: RuedasFinalCreateOrConnectWithoutTornoGInput
    upsert?: RuedasFinalUpsertWithoutTornoGInput
    disconnect?: RuedasFinalWhereInput | boolean
    delete?: RuedasFinalWhereInput | boolean
    connect?: RuedasFinalWhereUniqueInput
    update?: XOR<XOR<RuedasFinalUpdateToOneWithWhereWithoutTornoGInput, RuedasFinalUpdateWithoutTornoGInput>, RuedasFinalUncheckedUpdateWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoUpdateManyWithoutTornoGNestedInput = {
    create?: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput> | TornoRuedaTrabajoCreateWithoutTornoGInput[] | TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput[]
    connectOrCreate?: TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput | TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput[]
    upsert?: TornoRuedaTrabajoUpsertWithWhereUniqueWithoutTornoGInput | TornoRuedaTrabajoUpsertWithWhereUniqueWithoutTornoGInput[]
    createMany?: TornoRuedaTrabajoCreateManyTornoGInputEnvelope
    set?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    disconnect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    delete?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    connect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    update?: TornoRuedaTrabajoUpdateWithWhereUniqueWithoutTornoGInput | TornoRuedaTrabajoUpdateWithWhereUniqueWithoutTornoGInput[]
    updateMany?: TornoRuedaTrabajoUpdateManyWithWhereWithoutTornoGInput | TornoRuedaTrabajoUpdateManyWithWhereWithoutTornoGInput[]
    deleteMany?: TornoRuedaTrabajoScalarWhereInput | TornoRuedaTrabajoScalarWhereInput[]
  }

  export type TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGNestedInput = {
    create?: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput> | TornoRuedaTrabajoCreateWithoutTornoGInput[] | TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput[]
    connectOrCreate?: TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput | TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput[]
    upsert?: TornoRuedaTrabajoUpsertWithWhereUniqueWithoutTornoGInput | TornoRuedaTrabajoUpsertWithWhereUniqueWithoutTornoGInput[]
    createMany?: TornoRuedaTrabajoCreateManyTornoGInputEnvelope
    set?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    disconnect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    delete?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    connect?: TornoRuedaTrabajoWhereUniqueInput | TornoRuedaTrabajoWhereUniqueInput[]
    update?: TornoRuedaTrabajoUpdateWithWhereUniqueWithoutTornoGInput | TornoRuedaTrabajoUpdateWithWhereUniqueWithoutTornoGInput[]
    updateMany?: TornoRuedaTrabajoUpdateManyWithWhereWithoutTornoGInput | TornoRuedaTrabajoUpdateManyWithWhereWithoutTornoGInput[]
    deleteMany?: TornoRuedaTrabajoScalarWhereInput | TornoRuedaTrabajoScalarWhereInput[]
  }

  export type TornoGCreateNestedOneWithoutDetalleRuedasInput = {
    create?: XOR<TornoGCreateWithoutDetalleRuedasInput, TornoGUncheckedCreateWithoutDetalleRuedasInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutDetalleRuedasInput
    connect?: TornoGWhereUniqueInput
  }

  export type EnumLadoRuedaFieldUpdateOperationsInput = {
    set?: $Enums.LadoRueda
  }

  export type EnumEstadoTornoRuedaFieldUpdateOperationsInput = {
    set?: $Enums.EstadoTornoRueda
  }

  export type TornoGUpdateOneRequiredWithoutDetalleRuedasNestedInput = {
    create?: XOR<TornoGCreateWithoutDetalleRuedasInput, TornoGUncheckedCreateWithoutDetalleRuedasInput>
    connectOrCreate?: TornoGCreateOrConnectWithoutDetalleRuedasInput
    upsert?: TornoGUpsertWithoutDetalleRuedasInput
    connect?: TornoGWhereUniqueInput
    update?: XOR<XOR<TornoGUpdateToOneWithWhereWithoutDetalleRuedasInput, TornoGUpdateWithoutDetalleRuedasInput>, TornoGUncheckedUpdateWithoutDetalleRuedasInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumEstadoRondaServicioFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaServicio | EnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaServicioFilter<$PrismaModel> | $Enums.EstadoRondaServicio
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumEstadoRondaServicioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaServicio | EnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaServicio[] | ListEnumEstadoRondaServicioFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaServicioWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaServicio
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaServicioFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaServicioFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumTipoFallaTornoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFallaTorno | EnumTipoFallaTornoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFallaTornoFilter<$PrismaModel> | $Enums.TipoFallaTorno
  }

  export type NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoPadre | EnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoPadre
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumTipoFallaTornoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFallaTorno | EnumTipoFallaTornoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFallaTorno[] | ListEnumTipoFallaTornoFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFallaTornoWithAggregatesFilter<$PrismaModel> | $Enums.TipoFallaTorno
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoFallaTornoFilter<$PrismaModel>
    _max?: NestedEnumTipoFallaTornoFilter<$PrismaModel>
  }

  export type NestedEnumEstadoIncidenteTornoPadreWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoPadre | EnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoPadre[] | ListEnumEstadoIncidenteTornoPadreFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoPadreWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoPadre
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTornoPadreFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoHijo | EnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoHijo
  }

  export type NestedEnumEstadoIncidenteTornoHijoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTornoHijo | EnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTornoHijo[] | ListEnumEstadoIncidenteTornoHijoFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTornoHijoWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTornoHijo
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTornoHijoFilter<$PrismaModel>
  }

  export type NestedEnumEstadoTornoGFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoG | EnumEstadoTornoGFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoGFilter<$PrismaModel> | $Enums.EstadoTornoG
  }

  export type NestedEnumEstadoTornoGWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoG | EnumEstadoTornoGFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoG[] | ListEnumEstadoTornoGFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoGWithAggregatesFilter<$PrismaModel> | $Enums.EstadoTornoG
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoTornoGFilter<$PrismaModel>
    _max?: NestedEnumEstadoTornoGFilter<$PrismaModel>
  }

  export type NestedEnumLadoRuedaFilter<$PrismaModel = never> = {
    equals?: $Enums.LadoRueda | EnumLadoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumLadoRuedaFilter<$PrismaModel> | $Enums.LadoRueda
  }

  export type NestedEnumEstadoTornoRuedaFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoRueda | EnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel> | $Enums.EstadoTornoRueda
  }

  export type NestedEnumLadoRuedaWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LadoRueda | EnumLadoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.LadoRueda[] | ListEnumLadoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumLadoRuedaWithAggregatesFilter<$PrismaModel> | $Enums.LadoRueda
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLadoRuedaFilter<$PrismaModel>
    _max?: NestedEnumLadoRuedaFilter<$PrismaModel>
  }

  export type NestedEnumEstadoTornoRuedaWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoTornoRueda | EnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoTornoRueda[] | ListEnumEstadoTornoRuedaFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoTornoRuedaWithAggregatesFilter<$PrismaModel> | $Enums.EstadoTornoRueda
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel>
    _max?: NestedEnumEstadoTornoRuedaFilter<$PrismaModel>
  }

  export type RuedasFinalCreateWithoutRuedaSolicitudInput = {
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedasFinalInput
    tornoG?: TornoGCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput = {
    id?: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedasFinalInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalCreateOrConnectWithoutRuedaSolicitudInput = {
    where: RuedasFinalWhereUniqueInput
    create: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type RondaServicioCreateWithoutRuedaSolicitudInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateWithoutRuedaSolicitudInput = {
    id?: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutRuedaSolicitudInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type TornoGCreateWithoutRuedaSolicitudInput = {
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    rondaServicio?: RondaServicioCreateNestedOneWithoutTornoGInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutTornoGInput
    detalleRuedas?: TornoRuedaTrabajoCreateNestedManyWithoutTornoGInput
  }

  export type TornoGUncheckedCreateWithoutRuedaSolicitudInput = {
    id?: number
    rondaServicioId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedCreateNestedManyWithoutTornoGInput
  }

  export type TornoGCreateOrConnectWithoutRuedaSolicitudInput = {
    where: TornoGWhereUniqueInput
    create: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type TornoGCreateManyRuedaSolicitudInputEnvelope = {
    data: TornoGCreateManyRuedaSolicitudInput | TornoGCreateManyRuedaSolicitudInput[]
    skipDuplicates?: boolean
  }

  export type IncidenteTornoCreateWithoutRuedaSolicitudInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    rondaServicio?: RondaServicioCreateNestedOneWithoutIncidentesInput
    rondasDetenidas?: RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    rondaServicioId?: number | null
    rondasDetenidas?: RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoCreateOrConnectWithoutRuedaSolicitudInput = {
    where: IncidenteTornoWhereUniqueInput
    create: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type IncidenteTornoCreateManyRuedaSolicitudInputEnvelope = {
    data: IncidenteTornoCreateManyRuedaSolicitudInput | IncidenteTornoCreateManyRuedaSolicitudInput[]
    skipDuplicates?: boolean
  }

  export type RuedasFinalUpsertWithoutRuedaSolicitudInput = {
    update: XOR<RuedasFinalUpdateWithoutRuedaSolicitudInput, RuedasFinalUncheckedUpdateWithoutRuedaSolicitudInput>
    create: XOR<RuedasFinalCreateWithoutRuedaSolicitudInput, RuedasFinalUncheckedCreateWithoutRuedaSolicitudInput>
    where?: RuedasFinalWhereInput
  }

  export type RuedasFinalUpdateToOneWithWhereWithoutRuedaSolicitudInput = {
    where?: RuedasFinalWhereInput
    data: XOR<RuedasFinalUpdateWithoutRuedaSolicitudInput, RuedasFinalUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type RuedasFinalUpdateWithoutRuedaSolicitudInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUpdateOneWithoutRuedasFinalNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedasFinalNestedInput
  }

  export type RuedasFinalUncheckedUpdateWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedasFinalNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedasFinalNestedInput
  }

  export type RondaServicioUpsertWithoutRuedaSolicitudInput = {
    update: XOR<RondaServicioUpdateWithoutRuedaSolicitudInput, RondaServicioUncheckedUpdateWithoutRuedaSolicitudInput>
    create: XOR<RondaServicioCreateWithoutRuedaSolicitudInput, RondaServicioUncheckedCreateWithoutRuedaSolicitudInput>
    where?: RondaServicioWhereInput
  }

  export type RondaServicioUpdateToOneWithWhereWithoutRuedaSolicitudInput = {
    where?: RondaServicioWhereInput
    data: XOR<RondaServicioUpdateWithoutRuedaSolicitudInput, RondaServicioUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type RondaServicioUpdateWithoutRuedaSolicitudInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type TornoGUpsertWithWhereUniqueWithoutRuedaSolicitudInput = {
    where: TornoGWhereUniqueInput
    update: XOR<TornoGUpdateWithoutRuedaSolicitudInput, TornoGUncheckedUpdateWithoutRuedaSolicitudInput>
    create: XOR<TornoGCreateWithoutRuedaSolicitudInput, TornoGUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type TornoGUpdateWithWhereUniqueWithoutRuedaSolicitudInput = {
    where: TornoGWhereUniqueInput
    data: XOR<TornoGUpdateWithoutRuedaSolicitudInput, TornoGUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type TornoGUpdateManyWithWhereWithoutRuedaSolicitudInput = {
    where: TornoGScalarWhereInput
    data: XOR<TornoGUpdateManyMutationInput, TornoGUncheckedUpdateManyWithoutRuedaSolicitudInput>
  }

  export type TornoGScalarWhereInput = {
    AND?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
    OR?: TornoGScalarWhereInput[]
    NOT?: TornoGScalarWhereInput | TornoGScalarWhereInput[]
    id?: IntFilter<"TornoG"> | number
    rondaServicioId?: IntNullableFilter<"TornoG"> | number | null
    ruedaSolicitudId?: IntNullableFilter<"TornoG"> | number | null
    ruedasFinalId?: IntNullableFilter<"TornoG"> | number | null
    torneroId?: IntFilter<"TornoG"> | number
    estado?: EnumEstadoTornoGFilter<"TornoG"> | $Enums.EstadoTornoG
    cantidadRuedas?: IntFilter<"TornoG"> | number
    ruedasTerminadas?: IntFilter<"TornoG"> | number
    fechaInicio?: DateTimeNullableFilter<"TornoG"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoG"> | Date | string | null
  }

  export type IncidenteTornoUpsertWithWhereUniqueWithoutRuedaSolicitudInput = {
    where: IncidenteTornoWhereUniqueInput
    update: XOR<IncidenteTornoUpdateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedUpdateWithoutRuedaSolicitudInput>
    create: XOR<IncidenteTornoCreateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedCreateWithoutRuedaSolicitudInput>
  }

  export type IncidenteTornoUpdateWithWhereUniqueWithoutRuedaSolicitudInput = {
    where: IncidenteTornoWhereUniqueInput
    data: XOR<IncidenteTornoUpdateWithoutRuedaSolicitudInput, IncidenteTornoUncheckedUpdateWithoutRuedaSolicitudInput>
  }

  export type IncidenteTornoUpdateManyWithWhereWithoutRuedaSolicitudInput = {
    where: IncidenteTornoScalarWhereInput
    data: XOR<IncidenteTornoUpdateManyMutationInput, IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudInput>
  }

  export type IncidenteTornoScalarWhereInput = {
    AND?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
    OR?: IncidenteTornoScalarWhereInput[]
    NOT?: IncidenteTornoScalarWhereInput | IncidenteTornoScalarWhereInput[]
    id?: IntFilter<"IncidenteTorno"> | number
    tipoFalla?: EnumTipoFallaTornoFilter<"IncidenteTorno"> | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFilter<"IncidenteTorno"> | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFilter<"IncidenteTorno"> | boolean
    comentario?: StringNullableFilter<"IncidenteTorno"> | string | null
    creadoPorId?: IntFilter<"IncidenteTorno"> | number
    atendidoPorId?: IntNullableFilter<"IncidenteTorno"> | number | null
    imagen1?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTorno"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTorno"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    fechaAtencion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaTerminacion?: DateTimeNullableFilter<"IncidenteTorno"> | Date | string | null
    fechaActualizacion?: DateTimeFilter<"IncidenteTorno"> | Date | string
    ruedaSolicitudId?: IntNullableFilter<"IncidenteTorno"> | number | null
    rondaServicioId?: IntNullableFilter<"IncidenteTorno"> | number | null
  }

  export type RuedaSolicitudCreateWithoutRuedasFinalInput = {
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUncheckedCreateWithoutRuedasFinalInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudCreateOrConnectWithoutRuedasFinalInput = {
    where: RuedaSolicitudWhereUniqueInput
    create: XOR<RuedaSolicitudCreateWithoutRuedasFinalInput, RuedaSolicitudUncheckedCreateWithoutRuedasFinalInput>
  }

  export type RondaServicioCreateWithoutRuedasFinalInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateWithoutRuedasFinalInput = {
    id?: number
    ruedaSolicitudId: number
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutRuedasFinalInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
  }

  export type TornoGCreateWithoutRuedasFinalInput = {
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    rondaServicio?: RondaServicioCreateNestedOneWithoutTornoGInput
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutTornoGInput
    detalleRuedas?: TornoRuedaTrabajoCreateNestedManyWithoutTornoGInput
  }

  export type TornoGUncheckedCreateWithoutRuedasFinalInput = {
    id?: number
    rondaServicioId?: number | null
    ruedaSolicitudId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedCreateNestedManyWithoutTornoGInput
  }

  export type TornoGCreateOrConnectWithoutRuedasFinalInput = {
    where: TornoGWhereUniqueInput
    create: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput>
  }

  export type TornoGCreateManyRuedasFinalInputEnvelope = {
    data: TornoGCreateManyRuedasFinalInput | TornoGCreateManyRuedasFinalInput[]
    skipDuplicates?: boolean
  }

  export type RuedaSolicitudUpsertWithoutRuedasFinalInput = {
    update: XOR<RuedaSolicitudUpdateWithoutRuedasFinalInput, RuedaSolicitudUncheckedUpdateWithoutRuedasFinalInput>
    create: XOR<RuedaSolicitudCreateWithoutRuedasFinalInput, RuedaSolicitudUncheckedCreateWithoutRuedasFinalInput>
    where?: RuedaSolicitudWhereInput
  }

  export type RuedaSolicitudUpdateToOneWithWhereWithoutRuedasFinalInput = {
    where?: RuedaSolicitudWhereInput
    data: XOR<RuedaSolicitudUpdateWithoutRuedasFinalInput, RuedaSolicitudUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type RuedaSolicitudUpdateWithoutRuedasFinalInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudUncheckedUpdateWithoutRuedasFinalInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RondaServicioUpsertWithoutRuedasFinalInput = {
    update: XOR<RondaServicioUpdateWithoutRuedasFinalInput, RondaServicioUncheckedUpdateWithoutRuedasFinalInput>
    create: XOR<RondaServicioCreateWithoutRuedasFinalInput, RondaServicioUncheckedCreateWithoutRuedasFinalInput>
    where?: RondaServicioWhereInput
  }

  export type RondaServicioUpdateToOneWithWhereWithoutRuedasFinalInput = {
    where?: RondaServicioWhereInput
    data: XOR<RondaServicioUpdateWithoutRuedasFinalInput, RondaServicioUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type RondaServicioUpdateWithoutRuedasFinalInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutRuedasFinalInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type TornoGUpsertWithWhereUniqueWithoutRuedasFinalInput = {
    where: TornoGWhereUniqueInput
    update: XOR<TornoGUpdateWithoutRuedasFinalInput, TornoGUncheckedUpdateWithoutRuedasFinalInput>
    create: XOR<TornoGCreateWithoutRuedasFinalInput, TornoGUncheckedCreateWithoutRuedasFinalInput>
  }

  export type TornoGUpdateWithWhereUniqueWithoutRuedasFinalInput = {
    where: TornoGWhereUniqueInput
    data: XOR<TornoGUpdateWithoutRuedasFinalInput, TornoGUncheckedUpdateWithoutRuedasFinalInput>
  }

  export type TornoGUpdateManyWithWhereWithoutRuedasFinalInput = {
    where: TornoGScalarWhereInput
    data: XOR<TornoGUpdateManyMutationInput, TornoGUncheckedUpdateManyWithoutRuedasFinalInput>
  }

  export type RuedaSolicitudCreateWithoutRondaServicioInput = {
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUncheckedCreateWithoutRondaServicioInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudCreateOrConnectWithoutRondaServicioInput = {
    where: RuedaSolicitudWhereUniqueInput
    create: XOR<RuedaSolicitudCreateWithoutRondaServicioInput, RuedaSolicitudUncheckedCreateWithoutRondaServicioInput>
  }

  export type RuedasFinalCreateWithoutRondaServicioInput = {
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRuedasFinalInput
    tornoG?: TornoGCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalUncheckedCreateWithoutRondaServicioInput = {
    id?: number
    ruedaSolicitudId: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedasFinalInput
  }

  export type RuedasFinalCreateOrConnectWithoutRondaServicioInput = {
    where: RuedasFinalWhereUniqueInput
    create: XOR<RuedasFinalCreateWithoutRondaServicioInput, RuedasFinalUncheckedCreateWithoutRondaServicioInput>
  }

  export type TornoGCreateWithoutRondaServicioInput = {
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutTornoGInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutTornoGInput
    detalleRuedas?: TornoRuedaTrabajoCreateNestedManyWithoutTornoGInput
  }

  export type TornoGUncheckedCreateWithoutRondaServicioInput = {
    id?: number
    ruedaSolicitudId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedCreateNestedManyWithoutTornoGInput
  }

  export type TornoGCreateOrConnectWithoutRondaServicioInput = {
    where: TornoGWhereUniqueInput
    create: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
  }

  export type IncidenteTornoCreateWithoutRondaServicioInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutIncidentesInput
    rondasDetenidas?: RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUncheckedCreateWithoutRondaServicioInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondasDetenidas?: RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoCreateOrConnectWithoutRondaServicioInput = {
    where: IncidenteTornoWhereUniqueInput
    create: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput>
  }

  export type IncidenteTornoCreateManyRondaServicioInputEnvelope = {
    data: IncidenteTornoCreateManyRondaServicioInput | IncidenteTornoCreateManyRondaServicioInput[]
    skipDuplicates?: boolean
  }

  export type IncidenteTornoCreateWithoutRondasDetenidasInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutIncidentesInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutIncidentesInput
    rondasCanceladas?: RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUncheckedCreateWithoutRondasDetenidasInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondaServicioId?: number | null
    rondasCanceladas?: RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput
    hijos?: IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoCreateOrConnectWithoutRondasDetenidasInput = {
    where: IncidenteTornoWhereUniqueInput
    create: XOR<IncidenteTornoCreateWithoutRondasDetenidasInput, IncidenteTornoUncheckedCreateWithoutRondasDetenidasInput>
  }

  export type IncidenteTornoCreateWithoutRondasCanceladasInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutIncidentesInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutIncidentesInput
    rondasDetenidas?: RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput
    hijos?: IncidenteTornoHijoCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoUncheckedCreateWithoutRondasCanceladasInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondaServicioId?: number | null
    rondasDetenidas?: RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput
    hijos?: IncidenteTornoHijoUncheckedCreateNestedManyWithoutIncidenteTornoInput
  }

  export type IncidenteTornoCreateOrConnectWithoutRondasCanceladasInput = {
    where: IncidenteTornoWhereUniqueInput
    create: XOR<IncidenteTornoCreateWithoutRondasCanceladasInput, IncidenteTornoUncheckedCreateWithoutRondasCanceladasInput>
  }

  export type RuedaSolicitudUpsertWithoutRondaServicioInput = {
    update: XOR<RuedaSolicitudUpdateWithoutRondaServicioInput, RuedaSolicitudUncheckedUpdateWithoutRondaServicioInput>
    create: XOR<RuedaSolicitudCreateWithoutRondaServicioInput, RuedaSolicitudUncheckedCreateWithoutRondaServicioInput>
    where?: RuedaSolicitudWhereInput
  }

  export type RuedaSolicitudUpdateToOneWithWhereWithoutRondaServicioInput = {
    where?: RuedaSolicitudWhereInput
    data: XOR<RuedaSolicitudUpdateWithoutRondaServicioInput, RuedaSolicitudUncheckedUpdateWithoutRondaServicioInput>
  }

  export type RuedaSolicitudUpdateWithoutRondaServicioInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudUncheckedUpdateWithoutRondaServicioInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedasFinalUpsertWithoutRondaServicioInput = {
    update: XOR<RuedasFinalUpdateWithoutRondaServicioInput, RuedasFinalUncheckedUpdateWithoutRondaServicioInput>
    create: XOR<RuedasFinalCreateWithoutRondaServicioInput, RuedasFinalUncheckedCreateWithoutRondaServicioInput>
    where?: RuedasFinalWhereInput
  }

  export type RuedasFinalUpdateToOneWithWhereWithoutRondaServicioInput = {
    where?: RuedasFinalWhereInput
    data: XOR<RuedasFinalUpdateWithoutRondaServicioInput, RuedasFinalUncheckedUpdateWithoutRondaServicioInput>
  }

  export type RuedasFinalUpdateWithoutRondaServicioInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRuedasFinalNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedasFinalNestedInput
  }

  export type RuedasFinalUncheckedUpdateWithoutRondaServicioInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedasFinalNestedInput
  }

  export type TornoGUpsertWithoutRondaServicioInput = {
    update: XOR<TornoGUpdateWithoutRondaServicioInput, TornoGUncheckedUpdateWithoutRondaServicioInput>
    create: XOR<TornoGCreateWithoutRondaServicioInput, TornoGUncheckedCreateWithoutRondaServicioInput>
    where?: TornoGWhereInput
  }

  export type TornoGUpdateToOneWithWhereWithoutRondaServicioInput = {
    where?: TornoGWhereInput
    data: XOR<TornoGUpdateWithoutRondaServicioInput, TornoGUncheckedUpdateWithoutRondaServicioInput>
  }

  export type TornoGUpdateWithoutRondaServicioInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutTornoGNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutTornoGNestedInput
    detalleRuedas?: TornoRuedaTrabajoUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateWithoutRondaServicioInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGNestedInput
  }

  export type IncidenteTornoUpsertWithWhereUniqueWithoutRondaServicioInput = {
    where: IncidenteTornoWhereUniqueInput
    update: XOR<IncidenteTornoUpdateWithoutRondaServicioInput, IncidenteTornoUncheckedUpdateWithoutRondaServicioInput>
    create: XOR<IncidenteTornoCreateWithoutRondaServicioInput, IncidenteTornoUncheckedCreateWithoutRondaServicioInput>
  }

  export type IncidenteTornoUpdateWithWhereUniqueWithoutRondaServicioInput = {
    where: IncidenteTornoWhereUniqueInput
    data: XOR<IncidenteTornoUpdateWithoutRondaServicioInput, IncidenteTornoUncheckedUpdateWithoutRondaServicioInput>
  }

  export type IncidenteTornoUpdateManyWithWhereWithoutRondaServicioInput = {
    where: IncidenteTornoScalarWhereInput
    data: XOR<IncidenteTornoUpdateManyMutationInput, IncidenteTornoUncheckedUpdateManyWithoutRondaServicioInput>
  }

  export type IncidenteTornoUpsertWithoutRondasDetenidasInput = {
    update: XOR<IncidenteTornoUpdateWithoutRondasDetenidasInput, IncidenteTornoUncheckedUpdateWithoutRondasDetenidasInput>
    create: XOR<IncidenteTornoCreateWithoutRondasDetenidasInput, IncidenteTornoUncheckedCreateWithoutRondasDetenidasInput>
    where?: IncidenteTornoWhereInput
  }

  export type IncidenteTornoUpdateToOneWithWhereWithoutRondasDetenidasInput = {
    where?: IncidenteTornoWhereInput
    data: XOR<IncidenteTornoUpdateWithoutRondasDetenidasInput, IncidenteTornoUncheckedUpdateWithoutRondasDetenidasInput>
  }

  export type IncidenteTornoUpdateWithoutRondasDetenidasInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutIncidentesNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutIncidentesNestedInput
    rondasCanceladas?: RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateWithoutRondasDetenidasInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasCanceladas?: RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUpsertWithoutRondasCanceladasInput = {
    update: XOR<IncidenteTornoUpdateWithoutRondasCanceladasInput, IncidenteTornoUncheckedUpdateWithoutRondasCanceladasInput>
    create: XOR<IncidenteTornoCreateWithoutRondasCanceladasInput, IncidenteTornoUncheckedCreateWithoutRondasCanceladasInput>
    where?: IncidenteTornoWhereInput
  }

  export type IncidenteTornoUpdateToOneWithWhereWithoutRondasCanceladasInput = {
    where?: IncidenteTornoWhereInput
    data: XOR<IncidenteTornoUpdateWithoutRondasCanceladasInput, IncidenteTornoUncheckedUpdateWithoutRondasCanceladasInput>
  }

  export type IncidenteTornoUpdateWithoutRondasCanceladasInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutIncidentesNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutIncidentesNestedInput
    rondasDetenidas?: RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateWithoutRondasCanceladasInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasDetenidas?: RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type CambioCreateWithoutNavaInput = {
    numeroNavaja: number
    createdAt?: Date | string
  }

  export type CambioUncheckedCreateWithoutNavaInput = {
    id?: number
    numeroNavaja: number
    createdAt?: Date | string
  }

  export type CambioCreateOrConnectWithoutNavaInput = {
    where: CambioWhereUniqueInput
    create: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput>
  }

  export type CambioCreateManyNavaInputEnvelope = {
    data: CambioCreateManyNavaInput | CambioCreateManyNavaInput[]
    skipDuplicates?: boolean
  }

  export type CambioUpsertWithWhereUniqueWithoutNavaInput = {
    where: CambioWhereUniqueInput
    update: XOR<CambioUpdateWithoutNavaInput, CambioUncheckedUpdateWithoutNavaInput>
    create: XOR<CambioCreateWithoutNavaInput, CambioUncheckedCreateWithoutNavaInput>
  }

  export type CambioUpdateWithWhereUniqueWithoutNavaInput = {
    where: CambioWhereUniqueInput
    data: XOR<CambioUpdateWithoutNavaInput, CambioUncheckedUpdateWithoutNavaInput>
  }

  export type CambioUpdateManyWithWhereWithoutNavaInput = {
    where: CambioScalarWhereInput
    data: XOR<CambioUpdateManyMutationInput, CambioUncheckedUpdateManyWithoutNavaInput>
  }

  export type CambioScalarWhereInput = {
    AND?: CambioScalarWhereInput | CambioScalarWhereInput[]
    OR?: CambioScalarWhereInput[]
    NOT?: CambioScalarWhereInput | CambioScalarWhereInput[]
    id?: IntFilter<"Cambio"> | number
    localidadId?: IntFilter<"Cambio"> | number
    numeroNavaja?: IntFilter<"Cambio"> | number
    createdAt?: DateTimeFilter<"Cambio"> | Date | string
  }

  export type NavaCreateWithoutCambiosInput = {
    localidadId: number
    cantidad: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NavaUncheckedCreateWithoutCambiosInput = {
    id?: number
    localidadId: number
    cantidad: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NavaCreateOrConnectWithoutCambiosInput = {
    where: NavaWhereUniqueInput
    create: XOR<NavaCreateWithoutCambiosInput, NavaUncheckedCreateWithoutCambiosInput>
  }

  export type NavaUpsertWithoutCambiosInput = {
    update: XOR<NavaUpdateWithoutCambiosInput, NavaUncheckedUpdateWithoutCambiosInput>
    create: XOR<NavaCreateWithoutCambiosInput, NavaUncheckedCreateWithoutCambiosInput>
    where?: NavaWhereInput
  }

  export type NavaUpdateToOneWithWhereWithoutCambiosInput = {
    where?: NavaWhereInput
    data: XOR<NavaUpdateWithoutCambiosInput, NavaUncheckedUpdateWithoutCambiosInput>
  }

  export type NavaUpdateWithoutCambiosInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NavaUncheckedUpdateWithoutCambiosInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    cantidad?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuedaSolicitudCreateWithoutIncidentesInput = {
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUncheckedCreateWithoutIncidentesInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    tornoG?: TornoGUncheckedCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudCreateOrConnectWithoutIncidentesInput = {
    where: RuedaSolicitudWhereUniqueInput
    create: XOR<RuedaSolicitudCreateWithoutIncidentesInput, RuedaSolicitudUncheckedCreateWithoutIncidentesInput>
  }

  export type RondaServicioCreateWithoutIncidentesInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateWithoutIncidentesInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutIncidentesInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutIncidentesInput, RondaServicioUncheckedCreateWithoutIncidentesInput>
  }

  export type RondaServicioCreateWithoutDetenidoPorIncidenteInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutDetenidoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput>
  }

  export type RondaServicioCreateManyDetenidoPorIncidenteInputEnvelope = {
    data: RondaServicioCreateManyDetenidoPorIncidenteInput | RondaServicioCreateManyDetenidoPorIncidenteInput[]
    skipDuplicates?: boolean
  }

  export type RondaServicioCreateWithoutCanceladoPorIncidenteInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    tornoG?: TornoGCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
  }

  export type RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tornoG?: TornoGUncheckedCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutCanceladoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput>
  }

  export type RondaServicioCreateManyCanceladoPorIncidenteInputEnvelope = {
    data: RondaServicioCreateManyCanceladoPorIncidenteInput | RondaServicioCreateManyCanceladoPorIncidenteInput[]
    skipDuplicates?: boolean
  }

  export type IncidenteTornoHijoCreateWithoutIncidenteTornoInput = {
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
  }

  export type IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput = {
    id?: number
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
  }

  export type IncidenteTornoHijoCreateOrConnectWithoutIncidenteTornoInput = {
    where: IncidenteTornoHijoWhereUniqueInput
    create: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput>
  }

  export type IncidenteTornoHijoCreateManyIncidenteTornoInputEnvelope = {
    data: IncidenteTornoHijoCreateManyIncidenteTornoInput | IncidenteTornoHijoCreateManyIncidenteTornoInput[]
    skipDuplicates?: boolean
  }

  export type RuedaSolicitudUpsertWithoutIncidentesInput = {
    update: XOR<RuedaSolicitudUpdateWithoutIncidentesInput, RuedaSolicitudUncheckedUpdateWithoutIncidentesInput>
    create: XOR<RuedaSolicitudCreateWithoutIncidentesInput, RuedaSolicitudUncheckedCreateWithoutIncidentesInput>
    where?: RuedaSolicitudWhereInput
  }

  export type RuedaSolicitudUpdateToOneWithWhereWithoutIncidentesInput = {
    where?: RuedaSolicitudWhereInput
    data: XOR<RuedaSolicitudUpdateWithoutIncidentesInput, RuedaSolicitudUncheckedUpdateWithoutIncidentesInput>
  }

  export type RuedaSolicitudUpdateWithoutIncidentesInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudUncheckedUpdateWithoutIncidentesInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    tornoG?: TornoGUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RondaServicioUpsertWithoutIncidentesInput = {
    update: XOR<RondaServicioUpdateWithoutIncidentesInput, RondaServicioUncheckedUpdateWithoutIncidentesInput>
    create: XOR<RondaServicioCreateWithoutIncidentesInput, RondaServicioUncheckedCreateWithoutIncidentesInput>
    where?: RondaServicioWhereInput
  }

  export type RondaServicioUpdateToOneWithWhereWithoutIncidentesInput = {
    where?: RondaServicioWhereInput
    data: XOR<RondaServicioUpdateWithoutIncidentesInput, RondaServicioUncheckedUpdateWithoutIncidentesInput>
  }

  export type RondaServicioUpdateWithoutIncidentesInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutIncidentesInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
  }

  export type RondaServicioUpsertWithWhereUniqueWithoutDetenidoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    update: XOR<RondaServicioUpdateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedUpdateWithoutDetenidoPorIncidenteInput>
    create: XOR<RondaServicioCreateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedCreateWithoutDetenidoPorIncidenteInput>
  }

  export type RondaServicioUpdateWithWhereUniqueWithoutDetenidoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    data: XOR<RondaServicioUpdateWithoutDetenidoPorIncidenteInput, RondaServicioUncheckedUpdateWithoutDetenidoPorIncidenteInput>
  }

  export type RondaServicioUpdateManyWithWhereWithoutDetenidoPorIncidenteInput = {
    where: RondaServicioScalarWhereInput
    data: XOR<RondaServicioUpdateManyMutationInput, RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteInput>
  }

  export type RondaServicioScalarWhereInput = {
    AND?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
    OR?: RondaServicioScalarWhereInput[]
    NOT?: RondaServicioScalarWhereInput | RondaServicioScalarWhereInput[]
    id?: IntFilter<"RondaServicio"> | number
    ruedaSolicitudId?: IntFilter<"RondaServicio"> | number
    ruedasFinalId?: IntNullableFilter<"RondaServicio"> | number | null
    status?: EnumEstadoRondaServicioFilter<"RondaServicio"> | $Enums.EstadoRondaServicio
    torneroId?: IntNullableFilter<"RondaServicio"> | number | null
    inicio?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    fin?: DateTimeNullableFilter<"RondaServicio"> | Date | string | null
    detenidoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    canceladoPorIncidenteId?: IntNullableFilter<"RondaServicio"> | number | null
    createdAt?: DateTimeFilter<"RondaServicio"> | Date | string
    updatedAt?: DateTimeFilter<"RondaServicio"> | Date | string
  }

  export type RondaServicioUpsertWithWhereUniqueWithoutCanceladoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    update: XOR<RondaServicioUpdateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedUpdateWithoutCanceladoPorIncidenteInput>
    create: XOR<RondaServicioCreateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedCreateWithoutCanceladoPorIncidenteInput>
  }

  export type RondaServicioUpdateWithWhereUniqueWithoutCanceladoPorIncidenteInput = {
    where: RondaServicioWhereUniqueInput
    data: XOR<RondaServicioUpdateWithoutCanceladoPorIncidenteInput, RondaServicioUncheckedUpdateWithoutCanceladoPorIncidenteInput>
  }

  export type RondaServicioUpdateManyWithWhereWithoutCanceladoPorIncidenteInput = {
    where: RondaServicioScalarWhereInput
    data: XOR<RondaServicioUpdateManyMutationInput, RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteInput>
  }

  export type IncidenteTornoHijoUpsertWithWhereUniqueWithoutIncidenteTornoInput = {
    where: IncidenteTornoHijoWhereUniqueInput
    update: XOR<IncidenteTornoHijoUpdateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedUpdateWithoutIncidenteTornoInput>
    create: XOR<IncidenteTornoHijoCreateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedCreateWithoutIncidenteTornoInput>
  }

  export type IncidenteTornoHijoUpdateWithWhereUniqueWithoutIncidenteTornoInput = {
    where: IncidenteTornoHijoWhereUniqueInput
    data: XOR<IncidenteTornoHijoUpdateWithoutIncidenteTornoInput, IncidenteTornoHijoUncheckedUpdateWithoutIncidenteTornoInput>
  }

  export type IncidenteTornoHijoUpdateManyWithWhereWithoutIncidenteTornoInput = {
    where: IncidenteTornoHijoScalarWhereInput
    data: XOR<IncidenteTornoHijoUpdateManyMutationInput, IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoInput>
  }

  export type IncidenteTornoHijoScalarWhereInput = {
    AND?: IncidenteTornoHijoScalarWhereInput | IncidenteTornoHijoScalarWhereInput[]
    OR?: IncidenteTornoHijoScalarWhereInput[]
    NOT?: IncidenteTornoHijoScalarWhereInput | IncidenteTornoHijoScalarWhereInput[]
    id?: IntFilter<"IncidenteTornoHijo"> | number
    incidenteTornoId?: IntFilter<"IncidenteTornoHijo"> | number
    status?: EnumEstadoIncidenteTornoHijoFilter<"IncidenteTornoHijo"> | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFilter<"IncidenteTornoHijo"> | boolean
    comentario?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen1?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen2?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    imagen3?: StringNullableFilter<"IncidenteTornoHijo"> | string | null
    fechaCreacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
    fechaActualizacion?: DateTimeFilter<"IncidenteTornoHijo"> | Date | string
  }

  export type IncidenteTornoCreateWithoutHijosInput = {
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutIncidentesInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutIncidentesInput
    rondasDetenidas?: RondaServicioCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioCreateNestedManyWithoutCanceladoPorIncidenteInput
  }

  export type IncidenteTornoUncheckedCreateWithoutHijosInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
    rondaServicioId?: number | null
    rondasDetenidas?: RondaServicioUncheckedCreateNestedManyWithoutDetenidoPorIncidenteInput
    rondasCanceladas?: RondaServicioUncheckedCreateNestedManyWithoutCanceladoPorIncidenteInput
  }

  export type IncidenteTornoCreateOrConnectWithoutHijosInput = {
    where: IncidenteTornoWhereUniqueInput
    create: XOR<IncidenteTornoCreateWithoutHijosInput, IncidenteTornoUncheckedCreateWithoutHijosInput>
  }

  export type IncidenteTornoUpsertWithoutHijosInput = {
    update: XOR<IncidenteTornoUpdateWithoutHijosInput, IncidenteTornoUncheckedUpdateWithoutHijosInput>
    create: XOR<IncidenteTornoCreateWithoutHijosInput, IncidenteTornoUncheckedCreateWithoutHijosInput>
    where?: IncidenteTornoWhereInput
  }

  export type IncidenteTornoUpdateToOneWithWhereWithoutHijosInput = {
    where?: IncidenteTornoWhereInput
    data: XOR<IncidenteTornoUpdateWithoutHijosInput, IncidenteTornoUncheckedUpdateWithoutHijosInput>
  }

  export type IncidenteTornoUpdateWithoutHijosInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutIncidentesNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutIncidentesNestedInput
    rondasDetenidas?: RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput
  }

  export type IncidenteTornoUncheckedUpdateWithoutHijosInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasDetenidas?: RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput
  }

  export type RondaServicioCreateWithoutTornoGInput = {
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRondaServicioInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRondaServicioInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRondaServicioInput
    detenidoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasDetenidasInput
    canceladoPorIncidente?: IncidenteTornoCreateNestedOneWithoutRondasCanceladasInput
  }

  export type RondaServicioUncheckedCreateWithoutTornoGInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRondaServicioInput
  }

  export type RondaServicioCreateOrConnectWithoutTornoGInput = {
    where: RondaServicioWhereUniqueInput
    create: XOR<RondaServicioCreateWithoutTornoGInput, RondaServicioUncheckedCreateWithoutTornoGInput>
  }

  export type RuedaSolicitudCreateWithoutTornoGInput = {
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudUncheckedCreateWithoutTornoGInput = {
    id?: number
    movimientoId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedasFinal?: RuedasFinalUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedaSolicitudInput
    incidentes?: IncidenteTornoUncheckedCreateNestedManyWithoutRuedaSolicitudInput
  }

  export type RuedaSolicitudCreateOrConnectWithoutTornoGInput = {
    where: RuedaSolicitudWhereUniqueInput
    create: XOR<RuedaSolicitudCreateWithoutTornoGInput, RuedaSolicitudUncheckedCreateWithoutTornoGInput>
  }

  export type RuedasFinalCreateWithoutTornoGInput = {
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ruedaSolicitud: RuedaSolicitudCreateNestedOneWithoutRuedasFinalInput
    rondaServicio?: RondaServicioCreateNestedOneWithoutRuedasFinalInput
  }

  export type RuedasFinalUncheckedCreateWithoutTornoGInput = {
    id?: number
    ruedaSolicitudId: number
    torneroId: number
    l1: string
    l2: string
    l3: string
    l4: string
    l5: string
    l6: string
    r1: string
    r2: string
    r3: string
    r4: string
    r5: string
    r6: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rondaServicio?: RondaServicioUncheckedCreateNestedOneWithoutRuedasFinalInput
  }

  export type RuedasFinalCreateOrConnectWithoutTornoGInput = {
    where: RuedasFinalWhereUniqueInput
    create: XOR<RuedasFinalCreateWithoutTornoGInput, RuedasFinalUncheckedCreateWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoCreateWithoutTornoGInput = {
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
  }

  export type TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput = {
    id?: number
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
  }

  export type TornoRuedaTrabajoCreateOrConnectWithoutTornoGInput = {
    where: TornoRuedaTrabajoWhereUniqueInput
    create: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoCreateManyTornoGInputEnvelope = {
    data: TornoRuedaTrabajoCreateManyTornoGInput | TornoRuedaTrabajoCreateManyTornoGInput[]
    skipDuplicates?: boolean
  }

  export type RondaServicioUpsertWithoutTornoGInput = {
    update: XOR<RondaServicioUpdateWithoutTornoGInput, RondaServicioUncheckedUpdateWithoutTornoGInput>
    create: XOR<RondaServicioCreateWithoutTornoGInput, RondaServicioUncheckedCreateWithoutTornoGInput>
    where?: RondaServicioWhereInput
  }

  export type RondaServicioUpdateToOneWithWhereWithoutTornoGInput = {
    where?: RondaServicioWhereInput
    data: XOR<RondaServicioUpdateWithoutTornoGInput, RondaServicioUncheckedUpdateWithoutTornoGInput>
  }

  export type RondaServicioUpdateWithoutTornoGInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutTornoGInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type RuedaSolicitudUpsertWithoutTornoGInput = {
    update: XOR<RuedaSolicitudUpdateWithoutTornoGInput, RuedaSolicitudUncheckedUpdateWithoutTornoGInput>
    create: XOR<RuedaSolicitudCreateWithoutTornoGInput, RuedaSolicitudUncheckedCreateWithoutTornoGInput>
    where?: RuedaSolicitudWhereInput
  }

  export type RuedaSolicitudUpdateToOneWithWhereWithoutTornoGInput = {
    where?: RuedaSolicitudWhereInput
    data: XOR<RuedaSolicitudUpdateWithoutTornoGInput, RuedaSolicitudUncheckedUpdateWithoutTornoGInput>
  }

  export type RuedaSolicitudUpdateWithoutTornoGInput = {
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedaSolicitudUncheckedUpdateWithoutTornoGInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedasFinal?: RuedasFinalUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedaSolicitudNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudNestedInput
  }

  export type RuedasFinalUpsertWithoutTornoGInput = {
    update: XOR<RuedasFinalUpdateWithoutTornoGInput, RuedasFinalUncheckedUpdateWithoutTornoGInput>
    create: XOR<RuedasFinalCreateWithoutTornoGInput, RuedasFinalUncheckedCreateWithoutTornoGInput>
    where?: RuedasFinalWhereInput
  }

  export type RuedasFinalUpdateToOneWithWhereWithoutTornoGInput = {
    where?: RuedasFinalWhereInput
    data: XOR<RuedasFinalUpdateWithoutTornoGInput, RuedasFinalUncheckedUpdateWithoutTornoGInput>
  }

  export type RuedasFinalUpdateWithoutTornoGInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRuedasFinalNestedInput
    rondaServicio?: RondaServicioUpdateOneWithoutRuedasFinalNestedInput
  }

  export type RuedasFinalUncheckedUpdateWithoutTornoGInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    torneroId?: IntFieldUpdateOperationsInput | number
    l1?: StringFieldUpdateOperationsInput | string
    l2?: StringFieldUpdateOperationsInput | string
    l3?: StringFieldUpdateOperationsInput | string
    l4?: StringFieldUpdateOperationsInput | string
    l5?: StringFieldUpdateOperationsInput | string
    l6?: StringFieldUpdateOperationsInput | string
    r1?: StringFieldUpdateOperationsInput | string
    r2?: StringFieldUpdateOperationsInput | string
    r3?: StringFieldUpdateOperationsInput | string
    r4?: StringFieldUpdateOperationsInput | string
    r5?: StringFieldUpdateOperationsInput | string
    r6?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUncheckedUpdateOneWithoutRuedasFinalNestedInput
  }

  export type TornoRuedaTrabajoUpsertWithWhereUniqueWithoutTornoGInput = {
    where: TornoRuedaTrabajoWhereUniqueInput
    update: XOR<TornoRuedaTrabajoUpdateWithoutTornoGInput, TornoRuedaTrabajoUncheckedUpdateWithoutTornoGInput>
    create: XOR<TornoRuedaTrabajoCreateWithoutTornoGInput, TornoRuedaTrabajoUncheckedCreateWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoUpdateWithWhereUniqueWithoutTornoGInput = {
    where: TornoRuedaTrabajoWhereUniqueInput
    data: XOR<TornoRuedaTrabajoUpdateWithoutTornoGInput, TornoRuedaTrabajoUncheckedUpdateWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoUpdateManyWithWhereWithoutTornoGInput = {
    where: TornoRuedaTrabajoScalarWhereInput
    data: XOR<TornoRuedaTrabajoUpdateManyMutationInput, TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGInput>
  }

  export type TornoRuedaTrabajoScalarWhereInput = {
    AND?: TornoRuedaTrabajoScalarWhereInput | TornoRuedaTrabajoScalarWhereInput[]
    OR?: TornoRuedaTrabajoScalarWhereInput[]
    NOT?: TornoRuedaTrabajoScalarWhereInput | TornoRuedaTrabajoScalarWhereInput[]
    id?: IntFilter<"TornoRuedaTrabajo"> | number
    tornoGId?: IntFilter<"TornoRuedaTrabajo"> | number
    lado?: EnumLadoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.LadoRueda
    posicion?: IntFilter<"TornoRuedaTrabajo"> | number
    estado?: EnumEstadoTornoRuedaFilter<"TornoRuedaTrabajo"> | $Enums.EstadoTornoRueda
    fechaInicio?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"TornoRuedaTrabajo"> | Date | string | null
    duracionSegundos?: IntNullableFilter<"TornoRuedaTrabajo"> | number | null
  }

  export type TornoGCreateWithoutDetalleRuedasInput = {
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    rondaServicio?: RondaServicioCreateNestedOneWithoutTornoGInput
    ruedaSolicitud?: RuedaSolicitudCreateNestedOneWithoutTornoGInput
    ruedasFinal?: RuedasFinalCreateNestedOneWithoutTornoGInput
  }

  export type TornoGUncheckedCreateWithoutDetalleRuedasInput = {
    id?: number
    rondaServicioId?: number | null
    ruedaSolicitudId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
  }

  export type TornoGCreateOrConnectWithoutDetalleRuedasInput = {
    where: TornoGWhereUniqueInput
    create: XOR<TornoGCreateWithoutDetalleRuedasInput, TornoGUncheckedCreateWithoutDetalleRuedasInput>
  }

  export type TornoGUpsertWithoutDetalleRuedasInput = {
    update: XOR<TornoGUpdateWithoutDetalleRuedasInput, TornoGUncheckedUpdateWithoutDetalleRuedasInput>
    create: XOR<TornoGCreateWithoutDetalleRuedasInput, TornoGUncheckedCreateWithoutDetalleRuedasInput>
    where?: TornoGWhereInput
  }

  export type TornoGUpdateToOneWithWhereWithoutDetalleRuedasInput = {
    where?: TornoGWhereInput
    data: XOR<TornoGUpdateWithoutDetalleRuedasInput, TornoGUncheckedUpdateWithoutDetalleRuedasInput>
  }

  export type TornoGUpdateWithoutDetalleRuedasInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rondaServicio?: RondaServicioUpdateOneWithoutTornoGNestedInput
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutTornoGNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateWithoutDetalleRuedasInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TornoGCreateManyRuedaSolicitudInput = {
    id?: number
    rondaServicioId?: number | null
    ruedasFinalId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
  }

  export type IncidenteTornoCreateManyRuedaSolicitudInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    rondaServicioId?: number | null
  }

  export type TornoGUpdateWithoutRuedaSolicitudInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rondaServicio?: RondaServicioUpdateOneWithoutTornoGNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutTornoGNestedInput
    detalleRuedas?: TornoRuedaTrabajoUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateManyWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type IncidenteTornoUpdateWithoutRuedaSolicitudInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicio?: RondaServicioUpdateOneWithoutIncidentesNestedInput
    rondasDetenidas?: RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasDetenidas?: RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateManyWithoutRuedaSolicitudInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type TornoGCreateManyRuedasFinalInput = {
    id?: number
    rondaServicioId?: number | null
    ruedaSolicitudId?: number | null
    torneroId: number
    estado?: $Enums.EstadoTornoG
    cantidadRuedas: number
    ruedasTerminadas?: number
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
  }

  export type TornoGUpdateWithoutRuedasFinalInput = {
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rondaServicio?: RondaServicioUpdateOneWithoutTornoGNestedInput
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutTornoGNestedInput
    detalleRuedas?: TornoRuedaTrabajoUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateWithoutRuedasFinalInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detalleRuedas?: TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGNestedInput
  }

  export type TornoGUncheckedUpdateManyWithoutRuedasFinalInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaServicioId?: NullableIntFieldUpdateOperationsInput | number | null
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    torneroId?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoGFieldUpdateOperationsInput | $Enums.EstadoTornoG
    cantidadRuedas?: IntFieldUpdateOperationsInput | number
    ruedasTerminadas?: IntFieldUpdateOperationsInput | number
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type IncidenteTornoCreateManyRondaServicioInput = {
    id?: number
    tipoFalla: $Enums.TipoFallaTorno
    status?: $Enums.EstadoIncidenteTornoPadre
    resuelto?: boolean
    comentario?: string | null
    creadoPorId: number
    atendidoPorId?: number | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaAtencion?: Date | string | null
    fechaTerminacion?: Date | string | null
    fechaActualizacion?: Date | string
    ruedaSolicitudId?: number | null
  }

  export type IncidenteTornoUpdateWithoutRondaServicioInput = {
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneWithoutIncidentesNestedInput
    rondasDetenidas?: RondaServicioUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateWithoutRondaServicioInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
    rondasDetenidas?: RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteNestedInput
    rondasCanceladas?: RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteNestedInput
    hijos?: IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoNestedInput
  }

  export type IncidenteTornoUncheckedUpdateManyWithoutRondaServicioInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipoFalla?: EnumTipoFallaTornoFieldUpdateOperationsInput | $Enums.TipoFallaTorno
    status?: EnumEstadoIncidenteTornoPadreFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoPadre
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    creadoPorId?: IntFieldUpdateOperationsInput | number
    atendidoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaAtencion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaTerminacion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitudId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type CambioCreateManyNavaInput = {
    id?: number
    numeroNavaja: number
    createdAt?: Date | string
  }

  export type CambioUpdateWithoutNavaInput = {
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CambioUncheckedUpdateWithoutNavaInput = {
    id?: IntFieldUpdateOperationsInput | number
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CambioUncheckedUpdateManyWithoutNavaInput = {
    id?: IntFieldUpdateOperationsInput | number
    numeroNavaja?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaServicioCreateManyDetenidoPorIncidenteInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    canceladoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaServicioCreateManyCanceladoPorIncidenteInput = {
    id?: number
    ruedaSolicitudId: number
    ruedasFinalId?: number | null
    status?: $Enums.EstadoRondaServicio
    torneroId?: number | null
    inicio?: Date | string | null
    fin?: Date | string | null
    detenidoPorIncidenteId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTornoHijoCreateManyIncidenteTornoInput = {
    id?: number
    status?: $Enums.EstadoIncidenteTornoHijo
    resuelto?: boolean
    comentario?: string | null
    imagen1?: string | null
    imagen2?: string | null
    imagen3?: string | null
    fechaCreacion?: Date | string
    fechaActualizacion?: Date | string
  }

  export type RondaServicioUpdateWithoutDetenidoPorIncidenteInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    canceladoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasCanceladasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutDetenidoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type RondaServicioUncheckedUpdateManyWithoutDetenidoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceladoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaServicioUpdateWithoutCanceladoPorIncidenteInput = {
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ruedaSolicitud?: RuedaSolicitudUpdateOneRequiredWithoutRondaServicioNestedInput
    ruedasFinal?: RuedasFinalUpdateOneWithoutRondaServicioNestedInput
    tornoG?: TornoGUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUpdateManyWithoutRondaServicioNestedInput
    detenidoPorIncidente?: IncidenteTornoUpdateOneWithoutRondasDetenidasNestedInput
  }

  export type RondaServicioUncheckedUpdateWithoutCanceladoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tornoG?: TornoGUncheckedUpdateOneWithoutRondaServicioNestedInput
    incidentes?: IncidenteTornoUncheckedUpdateManyWithoutRondaServicioNestedInput
  }

  export type RondaServicioUncheckedUpdateManyWithoutCanceladoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    ruedaSolicitudId?: IntFieldUpdateOperationsInput | number
    ruedasFinalId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumEstadoRondaServicioFieldUpdateOperationsInput | $Enums.EstadoRondaServicio
    torneroId?: NullableIntFieldUpdateOperationsInput | number | null
    inicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    detenidoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoHijoUpdateWithoutIncidenteTornoInput = {
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoHijoUncheckedUpdateWithoutIncidenteTornoInput = {
    id?: IntFieldUpdateOperationsInput | number
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTornoHijoUncheckedUpdateManyWithoutIncidenteTornoInput = {
    id?: IntFieldUpdateOperationsInput | number
    status?: EnumEstadoIncidenteTornoHijoFieldUpdateOperationsInput | $Enums.EstadoIncidenteTornoHijo
    resuelto?: BoolFieldUpdateOperationsInput | boolean
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    imagen1?: NullableStringFieldUpdateOperationsInput | string | null
    imagen2?: NullableStringFieldUpdateOperationsInput | string | null
    imagen3?: NullableStringFieldUpdateOperationsInput | string | null
    fechaCreacion?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaActualizacion?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TornoRuedaTrabajoCreateManyTornoGInput = {
    id?: number
    lado: $Enums.LadoRueda
    posicion: number
    estado?: $Enums.EstadoTornoRueda
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    duracionSegundos?: number | null
  }

  export type TornoRuedaTrabajoUpdateWithoutTornoGInput = {
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type TornoRuedaTrabajoUncheckedUpdateWithoutTornoGInput = {
    id?: IntFieldUpdateOperationsInput | number
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type TornoRuedaTrabajoUncheckedUpdateManyWithoutTornoGInput = {
    id?: IntFieldUpdateOperationsInput | number
    lado?: EnumLadoRuedaFieldUpdateOperationsInput | $Enums.LadoRueda
    posicion?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoTornoRuedaFieldUpdateOperationsInput | $Enums.EstadoTornoRueda
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    duracionSegundos?: NullableIntFieldUpdateOperationsInput | number | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}