
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
 * Model MovimientoTorreonFerro
 * 
 */
export type MovimientoTorreonFerro = $Result.DefaultSelection<Prisma.$MovimientoTorreonFerroPayload>
/**
 * Model RondaTorreon
 * 
 */
export type RondaTorreon = $Result.DefaultSelection<Prisma.$RondaTorreonPayload>
/**
 * Model RondaTorreonMovimiento
 * 
 */
export type RondaTorreonMovimiento = $Result.DefaultSelection<Prisma.$RondaTorreonMovimientoPayload>
/**
 * Model IncidenteTorreonFerro
 * 
 */
export type IncidenteTorreonFerro = $Result.DefaultSelection<Prisma.$IncidenteTorreonFerroPayload>
/**
 * Model MovimientoTorreonFoto
 * 
 */
export type MovimientoTorreonFoto = $Result.DefaultSelection<Prisma.$MovimientoTorreonFotoPayload>
/**
 * Model IncidenteTorreonFoto
 * 
 */
export type IncidenteTorreonFoto = $Result.DefaultSelection<Prisma.$IncidenteTorreonFotoPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const PrioridadTorreon: {
  BAJA: 'BAJA',
  ALTA: 'ALTA'
};

export type PrioridadTorreon = (typeof PrioridadTorreon)[keyof typeof PrioridadTorreon]


export const EstadoMovimientoTorreon: {
  SOLICITADO: 'SOLICITADO',
  ASIGNADO: 'ASIGNADO',
  EN_PROCESO: 'EN_PROCESO',
  DETENIDO: 'DETENIDO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO'
};

export type EstadoMovimientoTorreon = (typeof EstadoMovimientoTorreon)[keyof typeof EstadoMovimientoTorreon]


export const TipoMovimientoTorreon: {
  MD_TRABAJANDO: 'MD_TRABAJANDO',
  REMOLCADA: 'REMOLCADA'
};

export type TipoMovimientoTorreon = (typeof TipoMovimientoTorreon)[keyof typeof TipoMovimientoTorreon]


export const PosicionCabinaTorreon: {
  Sin_Solicitar: 'Sin_Solicitar',
  DENTRO: 'DENTRO',
  AFUERA: 'AFUERA'
};

export type PosicionCabinaTorreon = (typeof PosicionCabinaTorreon)[keyof typeof PosicionCabinaTorreon]


export const PosicionChimeneaTorreon: {
  Sin_Solicitar: 'Sin_Solicitar',
  DENTRO: 'DENTRO',
  AFUERA: 'AFUERA'
};

export type PosicionChimeneaTorreon = (typeof PosicionChimeneaTorreon)[keyof typeof PosicionChimeneaTorreon]


export const DireccionEmpujeTorreon: {
  Sin_Solicitar: 'Sin_Solicitar',
  EMPUJAR: 'EMPUJAR',
  JALAR: 'JALAR'
};

export type DireccionEmpujeTorreon = (typeof DireccionEmpujeTorreon)[keyof typeof DireccionEmpujeTorreon]


export const EstadoRondaTorreon: {
  ABIERTA: 'ABIERTA',
  EN_PROCESO: 'EN_PROCESO',
  CERRADA: 'CERRADA',
  CANCELADA: 'CANCELADA'
};

export type EstadoRondaTorreon = (typeof EstadoRondaTorreon)[keyof typeof EstadoRondaTorreon]


export const EstadoRondaMovimientoTorreon: {
  PENDIENTE: 'PENDIENTE',
  ACTIVO: 'ACTIVO',
  BLOQUEADO: 'BLOQUEADO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO'
};

export type EstadoRondaMovimientoTorreon = (typeof EstadoRondaMovimientoTorreon)[keyof typeof EstadoRondaMovimientoTorreon]


export const EstadoIncidenteTorreon: {
  ABIERTO: 'ABIERTO',
  RESUELTO: 'RESUELTO'
};

export type EstadoIncidenteTorreon = (typeof EstadoIncidenteTorreon)[keyof typeof EstadoIncidenteTorreon]


export const TipoFotoMovimientoTorreon: {
  ANTES_MOVIMIENTO: 'ANTES_MOVIMIENTO',
  PROCESO_MOVIMIENTO: 'PROCESO_MOVIMIENTO',
  FIN_MOVIMIENTO: 'FIN_MOVIMIENTO'
};

export type TipoFotoMovimientoTorreon = (typeof TipoFotoMovimientoTorreon)[keyof typeof TipoFotoMovimientoTorreon]

}

export type PrioridadTorreon = $Enums.PrioridadTorreon

export const PrioridadTorreon: typeof $Enums.PrioridadTorreon

export type EstadoMovimientoTorreon = $Enums.EstadoMovimientoTorreon

export const EstadoMovimientoTorreon: typeof $Enums.EstadoMovimientoTorreon

export type TipoMovimientoTorreon = $Enums.TipoMovimientoTorreon

export const TipoMovimientoTorreon: typeof $Enums.TipoMovimientoTorreon

export type PosicionCabinaTorreon = $Enums.PosicionCabinaTorreon

export const PosicionCabinaTorreon: typeof $Enums.PosicionCabinaTorreon

export type PosicionChimeneaTorreon = $Enums.PosicionChimeneaTorreon

export const PosicionChimeneaTorreon: typeof $Enums.PosicionChimeneaTorreon

export type DireccionEmpujeTorreon = $Enums.DireccionEmpujeTorreon

export const DireccionEmpujeTorreon: typeof $Enums.DireccionEmpujeTorreon

export type EstadoRondaTorreon = $Enums.EstadoRondaTorreon

export const EstadoRondaTorreon: typeof $Enums.EstadoRondaTorreon

export type EstadoRondaMovimientoTorreon = $Enums.EstadoRondaMovimientoTorreon

export const EstadoRondaMovimientoTorreon: typeof $Enums.EstadoRondaMovimientoTorreon

export type EstadoIncidenteTorreon = $Enums.EstadoIncidenteTorreon

export const EstadoIncidenteTorreon: typeof $Enums.EstadoIncidenteTorreon

export type TipoFotoMovimientoTorreon = $Enums.TipoFotoMovimientoTorreon

export const TipoFotoMovimientoTorreon: typeof $Enums.TipoFotoMovimientoTorreon

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more MovimientoTorreonFerros
 * const movimientoTorreonFerros = await prisma.movimientoTorreonFerro.findMany()
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
   * // Fetch zero or more MovimientoTorreonFerros
   * const movimientoTorreonFerros = await prisma.movimientoTorreonFerro.findMany()
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
   * `prisma.movimientoTorreonFerro`: Exposes CRUD operations for the **MovimientoTorreonFerro** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MovimientoTorreonFerros
    * const movimientoTorreonFerros = await prisma.movimientoTorreonFerro.findMany()
    * ```
    */
  get movimientoTorreonFerro(): Prisma.MovimientoTorreonFerroDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rondaTorreon`: Exposes CRUD operations for the **RondaTorreon** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RondaTorreons
    * const rondaTorreons = await prisma.rondaTorreon.findMany()
    * ```
    */
  get rondaTorreon(): Prisma.RondaTorreonDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rondaTorreonMovimiento`: Exposes CRUD operations for the **RondaTorreonMovimiento** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RondaTorreonMovimientos
    * const rondaTorreonMovimientos = await prisma.rondaTorreonMovimiento.findMany()
    * ```
    */
  get rondaTorreonMovimiento(): Prisma.RondaTorreonMovimientoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.incidenteTorreonFerro`: Exposes CRUD operations for the **IncidenteTorreonFerro** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IncidenteTorreonFerros
    * const incidenteTorreonFerros = await prisma.incidenteTorreonFerro.findMany()
    * ```
    */
  get incidenteTorreonFerro(): Prisma.IncidenteTorreonFerroDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.movimientoTorreonFoto`: Exposes CRUD operations for the **MovimientoTorreonFoto** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MovimientoTorreonFotos
    * const movimientoTorreonFotos = await prisma.movimientoTorreonFoto.findMany()
    * ```
    */
  get movimientoTorreonFoto(): Prisma.MovimientoTorreonFotoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.incidenteTorreonFoto`: Exposes CRUD operations for the **IncidenteTorreonFoto** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IncidenteTorreonFotos
    * const incidenteTorreonFotos = await prisma.incidenteTorreonFoto.findMany()
    * ```
    */
  get incidenteTorreonFoto(): Prisma.IncidenteTorreonFotoDelegate<ExtArgs, ClientOptions>;
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
    MovimientoTorreonFerro: 'MovimientoTorreonFerro',
    RondaTorreon: 'RondaTorreon',
    RondaTorreonMovimiento: 'RondaTorreonMovimiento',
    IncidenteTorreonFerro: 'IncidenteTorreonFerro',
    MovimientoTorreonFoto: 'MovimientoTorreonFoto',
    IncidenteTorreonFoto: 'IncidenteTorreonFoto'
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
      modelProps: "movimientoTorreonFerro" | "rondaTorreon" | "rondaTorreonMovimiento" | "incidenteTorreonFerro" | "movimientoTorreonFoto" | "incidenteTorreonFoto"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      MovimientoTorreonFerro: {
        payload: Prisma.$MovimientoTorreonFerroPayload<ExtArgs>
        fields: Prisma.MovimientoTorreonFerroFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MovimientoTorreonFerroFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MovimientoTorreonFerroFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          findFirst: {
            args: Prisma.MovimientoTorreonFerroFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MovimientoTorreonFerroFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          findMany: {
            args: Prisma.MovimientoTorreonFerroFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>[]
          }
          create: {
            args: Prisma.MovimientoTorreonFerroCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          createMany: {
            args: Prisma.MovimientoTorreonFerroCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MovimientoTorreonFerroCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>[]
          }
          delete: {
            args: Prisma.MovimientoTorreonFerroDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          update: {
            args: Prisma.MovimientoTorreonFerroUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          deleteMany: {
            args: Prisma.MovimientoTorreonFerroDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MovimientoTorreonFerroUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MovimientoTorreonFerroUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>[]
          }
          upsert: {
            args: Prisma.MovimientoTorreonFerroUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFerroPayload>
          }
          aggregate: {
            args: Prisma.MovimientoTorreonFerroAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMovimientoTorreonFerro>
          }
          groupBy: {
            args: Prisma.MovimientoTorreonFerroGroupByArgs<ExtArgs>
            result: $Utils.Optional<MovimientoTorreonFerroGroupByOutputType>[]
          }
          count: {
            args: Prisma.MovimientoTorreonFerroCountArgs<ExtArgs>
            result: $Utils.Optional<MovimientoTorreonFerroCountAggregateOutputType> | number
          }
        }
      }
      RondaTorreon: {
        payload: Prisma.$RondaTorreonPayload<ExtArgs>
        fields: Prisma.RondaTorreonFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RondaTorreonFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RondaTorreonFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          findFirst: {
            args: Prisma.RondaTorreonFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RondaTorreonFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          findMany: {
            args: Prisma.RondaTorreonFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>[]
          }
          create: {
            args: Prisma.RondaTorreonCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          createMany: {
            args: Prisma.RondaTorreonCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RondaTorreonCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>[]
          }
          delete: {
            args: Prisma.RondaTorreonDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          update: {
            args: Prisma.RondaTorreonUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          deleteMany: {
            args: Prisma.RondaTorreonDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RondaTorreonUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RondaTorreonUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>[]
          }
          upsert: {
            args: Prisma.RondaTorreonUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonPayload>
          }
          aggregate: {
            args: Prisma.RondaTorreonAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRondaTorreon>
          }
          groupBy: {
            args: Prisma.RondaTorreonGroupByArgs<ExtArgs>
            result: $Utils.Optional<RondaTorreonGroupByOutputType>[]
          }
          count: {
            args: Prisma.RondaTorreonCountArgs<ExtArgs>
            result: $Utils.Optional<RondaTorreonCountAggregateOutputType> | number
          }
        }
      }
      RondaTorreonMovimiento: {
        payload: Prisma.$RondaTorreonMovimientoPayload<ExtArgs>
        fields: Prisma.RondaTorreonMovimientoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RondaTorreonMovimientoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RondaTorreonMovimientoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          findFirst: {
            args: Prisma.RondaTorreonMovimientoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RondaTorreonMovimientoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          findMany: {
            args: Prisma.RondaTorreonMovimientoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>[]
          }
          create: {
            args: Prisma.RondaTorreonMovimientoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          createMany: {
            args: Prisma.RondaTorreonMovimientoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RondaTorreonMovimientoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>[]
          }
          delete: {
            args: Prisma.RondaTorreonMovimientoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          update: {
            args: Prisma.RondaTorreonMovimientoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          deleteMany: {
            args: Prisma.RondaTorreonMovimientoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RondaTorreonMovimientoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RondaTorreonMovimientoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>[]
          }
          upsert: {
            args: Prisma.RondaTorreonMovimientoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RondaTorreonMovimientoPayload>
          }
          aggregate: {
            args: Prisma.RondaTorreonMovimientoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRondaTorreonMovimiento>
          }
          groupBy: {
            args: Prisma.RondaTorreonMovimientoGroupByArgs<ExtArgs>
            result: $Utils.Optional<RondaTorreonMovimientoGroupByOutputType>[]
          }
          count: {
            args: Prisma.RondaTorreonMovimientoCountArgs<ExtArgs>
            result: $Utils.Optional<RondaTorreonMovimientoCountAggregateOutputType> | number
          }
        }
      }
      IncidenteTorreonFerro: {
        payload: Prisma.$IncidenteTorreonFerroPayload<ExtArgs>
        fields: Prisma.IncidenteTorreonFerroFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IncidenteTorreonFerroFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IncidenteTorreonFerroFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          findFirst: {
            args: Prisma.IncidenteTorreonFerroFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IncidenteTorreonFerroFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          findMany: {
            args: Prisma.IncidenteTorreonFerroFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>[]
          }
          create: {
            args: Prisma.IncidenteTorreonFerroCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          createMany: {
            args: Prisma.IncidenteTorreonFerroCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.IncidenteTorreonFerroCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>[]
          }
          delete: {
            args: Prisma.IncidenteTorreonFerroDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          update: {
            args: Prisma.IncidenteTorreonFerroUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          deleteMany: {
            args: Prisma.IncidenteTorreonFerroDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IncidenteTorreonFerroUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.IncidenteTorreonFerroUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>[]
          }
          upsert: {
            args: Prisma.IncidenteTorreonFerroUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFerroPayload>
          }
          aggregate: {
            args: Prisma.IncidenteTorreonFerroAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIncidenteTorreonFerro>
          }
          groupBy: {
            args: Prisma.IncidenteTorreonFerroGroupByArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTorreonFerroGroupByOutputType>[]
          }
          count: {
            args: Prisma.IncidenteTorreonFerroCountArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTorreonFerroCountAggregateOutputType> | number
          }
        }
      }
      MovimientoTorreonFoto: {
        payload: Prisma.$MovimientoTorreonFotoPayload<ExtArgs>
        fields: Prisma.MovimientoTorreonFotoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MovimientoTorreonFotoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MovimientoTorreonFotoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          findFirst: {
            args: Prisma.MovimientoTorreonFotoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MovimientoTorreonFotoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          findMany: {
            args: Prisma.MovimientoTorreonFotoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>[]
          }
          create: {
            args: Prisma.MovimientoTorreonFotoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          createMany: {
            args: Prisma.MovimientoTorreonFotoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MovimientoTorreonFotoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>[]
          }
          delete: {
            args: Prisma.MovimientoTorreonFotoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          update: {
            args: Prisma.MovimientoTorreonFotoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          deleteMany: {
            args: Prisma.MovimientoTorreonFotoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MovimientoTorreonFotoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MovimientoTorreonFotoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>[]
          }
          upsert: {
            args: Prisma.MovimientoTorreonFotoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MovimientoTorreonFotoPayload>
          }
          aggregate: {
            args: Prisma.MovimientoTorreonFotoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMovimientoTorreonFoto>
          }
          groupBy: {
            args: Prisma.MovimientoTorreonFotoGroupByArgs<ExtArgs>
            result: $Utils.Optional<MovimientoTorreonFotoGroupByOutputType>[]
          }
          count: {
            args: Prisma.MovimientoTorreonFotoCountArgs<ExtArgs>
            result: $Utils.Optional<MovimientoTorreonFotoCountAggregateOutputType> | number
          }
        }
      }
      IncidenteTorreonFoto: {
        payload: Prisma.$IncidenteTorreonFotoPayload<ExtArgs>
        fields: Prisma.IncidenteTorreonFotoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IncidenteTorreonFotoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IncidenteTorreonFotoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          findFirst: {
            args: Prisma.IncidenteTorreonFotoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IncidenteTorreonFotoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          findMany: {
            args: Prisma.IncidenteTorreonFotoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>[]
          }
          create: {
            args: Prisma.IncidenteTorreonFotoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          createMany: {
            args: Prisma.IncidenteTorreonFotoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.IncidenteTorreonFotoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>[]
          }
          delete: {
            args: Prisma.IncidenteTorreonFotoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          update: {
            args: Prisma.IncidenteTorreonFotoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          deleteMany: {
            args: Prisma.IncidenteTorreonFotoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IncidenteTorreonFotoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.IncidenteTorreonFotoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>[]
          }
          upsert: {
            args: Prisma.IncidenteTorreonFotoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IncidenteTorreonFotoPayload>
          }
          aggregate: {
            args: Prisma.IncidenteTorreonFotoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIncidenteTorreonFoto>
          }
          groupBy: {
            args: Prisma.IncidenteTorreonFotoGroupByArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTorreonFotoGroupByOutputType>[]
          }
          count: {
            args: Prisma.IncidenteTorreonFotoCountArgs<ExtArgs>
            result: $Utils.Optional<IncidenteTorreonFotoCountAggregateOutputType> | number
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
    movimientoTorreonFerro?: MovimientoTorreonFerroOmit
    rondaTorreon?: RondaTorreonOmit
    rondaTorreonMovimiento?: RondaTorreonMovimientoOmit
    incidenteTorreonFerro?: IncidenteTorreonFerroOmit
    movimientoTorreonFoto?: MovimientoTorreonFotoOmit
    incidenteTorreonFoto?: IncidenteTorreonFotoOmit
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
   * Count Type MovimientoTorreonFerroCountOutputType
   */

  export type MovimientoTorreonFerroCountOutputType = {
    rondas: number
    incidentes: number
    fotos: number
  }

  export type MovimientoTorreonFerroCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondas?: boolean | MovimientoTorreonFerroCountOutputTypeCountRondasArgs
    incidentes?: boolean | MovimientoTorreonFerroCountOutputTypeCountIncidentesArgs
    fotos?: boolean | MovimientoTorreonFerroCountOutputTypeCountFotosArgs
  }

  // Custom InputTypes
  /**
   * MovimientoTorreonFerroCountOutputType without action
   */
  export type MovimientoTorreonFerroCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerroCountOutputType
     */
    select?: MovimientoTorreonFerroCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MovimientoTorreonFerroCountOutputType without action
   */
  export type MovimientoTorreonFerroCountOutputTypeCountRondasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaTorreonMovimientoWhereInput
  }

  /**
   * MovimientoTorreonFerroCountOutputType without action
   */
  export type MovimientoTorreonFerroCountOutputTypeCountIncidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTorreonFerroWhereInput
  }

  /**
   * MovimientoTorreonFerroCountOutputType without action
   */
  export type MovimientoTorreonFerroCountOutputTypeCountFotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MovimientoTorreonFotoWhereInput
  }


  /**
   * Count Type RondaTorreonCountOutputType
   */

  export type RondaTorreonCountOutputType = {
    movimientos: number
  }

  export type RondaTorreonCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimientos?: boolean | RondaTorreonCountOutputTypeCountMovimientosArgs
  }

  // Custom InputTypes
  /**
   * RondaTorreonCountOutputType without action
   */
  export type RondaTorreonCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonCountOutputType
     */
    select?: RondaTorreonCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RondaTorreonCountOutputType without action
   */
  export type RondaTorreonCountOutputTypeCountMovimientosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaTorreonMovimientoWhereInput
  }


  /**
   * Count Type IncidenteTorreonFerroCountOutputType
   */

  export type IncidenteTorreonFerroCountOutputType = {
    rondasBloqueadas: number
    fotos: number
  }

  export type IncidenteTorreonFerroCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondasBloqueadas?: boolean | IncidenteTorreonFerroCountOutputTypeCountRondasBloqueadasArgs
    fotos?: boolean | IncidenteTorreonFerroCountOutputTypeCountFotosArgs
  }

  // Custom InputTypes
  /**
   * IncidenteTorreonFerroCountOutputType without action
   */
  export type IncidenteTorreonFerroCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerroCountOutputType
     */
    select?: IncidenteTorreonFerroCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * IncidenteTorreonFerroCountOutputType without action
   */
  export type IncidenteTorreonFerroCountOutputTypeCountRondasBloqueadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaTorreonMovimientoWhereInput
  }

  /**
   * IncidenteTorreonFerroCountOutputType without action
   */
  export type IncidenteTorreonFerroCountOutputTypeCountFotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTorreonFotoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model MovimientoTorreonFerro
   */

  export type AggregateMovimientoTorreonFerro = {
    _count: MovimientoTorreonFerroCountAggregateOutputType | null
    _avg: MovimientoTorreonFerroAvgAggregateOutputType | null
    _sum: MovimientoTorreonFerroSumAggregateOutputType | null
    _min: MovimientoTorreonFerroMinAggregateOutputType | null
    _max: MovimientoTorreonFerroMaxAggregateOutputType | null
  }

  export type MovimientoTorreonFerroAvgAggregateOutputType = {
    id: number | null
    empresaId: number | null
    creadoPorId: number | null
    clienteId: number | null
    supervisorId: number | null
    coordinadorId: number | null
    operadorId: number | null
    localidadId: number | null
    viaOrigenId: number | null
    viaDestinoId: number | null
    seccionOrigenId: number | null
    seccionDestinoId: number | null
    locomotiveNumber: number | null
  }

  export type MovimientoTorreonFerroSumAggregateOutputType = {
    id: number | null
    empresaId: number | null
    creadoPorId: number | null
    clienteId: number | null
    supervisorId: number | null
    coordinadorId: number | null
    operadorId: number | null
    localidadId: number | null
    viaOrigenId: number | null
    viaDestinoId: number | null
    seccionOrigenId: number | null
    seccionDestinoId: number | null
    locomotiveNumber: number | null
  }

  export type MovimientoTorreonFerroMinAggregateOutputType = {
    id: number | null
    empresaId: number | null
    creadoPorId: number | null
    clienteId: number | null
    supervisorId: number | null
    coordinadorId: number | null
    operadorId: number | null
    localidadId: number | null
    viaOrigenId: number | null
    viaDestinoId: number | null
    seccionOrigenId: number | null
    seccionDestinoId: number | null
    locomotiveNumber: number | null
    prioridad: $Enums.PrioridadTorreon | null
    tipoMovimiento: $Enums.TipoMovimientoTorreon | null
    estado: $Enums.EstadoMovimientoTorreon | null
    fechaSolicitud: Date | null
    fechaInicio: Date | null
    fechaFin: Date | null
    fechaPausa: Date | null
    instrucciones: string | null
    posicionChimenea: $Enums.PosicionChimeneaTorreon | null
    finalizado: boolean | null
    direccionEmpuje: $Enums.DireccionEmpujeTorreon | null
    posicionCabina: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot: string | null
    localidadNombreSnapshot: string | null
    viaOrigenNombreSnapshot: string | null
    viaDestinoNombreSnapshot: string | null
    seccionOrigenNombreSnapshot: string | null
    seccionDestinoNombreSnapshot: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MovimientoTorreonFerroMaxAggregateOutputType = {
    id: number | null
    empresaId: number | null
    creadoPorId: number | null
    clienteId: number | null
    supervisorId: number | null
    coordinadorId: number | null
    operadorId: number | null
    localidadId: number | null
    viaOrigenId: number | null
    viaDestinoId: number | null
    seccionOrigenId: number | null
    seccionDestinoId: number | null
    locomotiveNumber: number | null
    prioridad: $Enums.PrioridadTorreon | null
    tipoMovimiento: $Enums.TipoMovimientoTorreon | null
    estado: $Enums.EstadoMovimientoTorreon | null
    fechaSolicitud: Date | null
    fechaInicio: Date | null
    fechaFin: Date | null
    fechaPausa: Date | null
    instrucciones: string | null
    posicionChimenea: $Enums.PosicionChimeneaTorreon | null
    finalizado: boolean | null
    direccionEmpuje: $Enums.DireccionEmpujeTorreon | null
    posicionCabina: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot: string | null
    localidadNombreSnapshot: string | null
    viaOrigenNombreSnapshot: string | null
    viaDestinoNombreSnapshot: string | null
    seccionOrigenNombreSnapshot: string | null
    seccionDestinoNombreSnapshot: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MovimientoTorreonFerroCountAggregateOutputType = {
    id: number
    empresaId: number
    creadoPorId: number
    clienteId: number
    supervisorId: number
    coordinadorId: number
    operadorId: number
    localidadId: number
    viaOrigenId: number
    viaDestinoId: number
    seccionOrigenId: number
    seccionDestinoId: number
    locomotiveNumber: number
    prioridad: number
    tipoMovimiento: number
    estado: number
    fechaSolicitud: number
    fechaInicio: number
    fechaFin: number
    fechaPausa: number
    instrucciones: number
    posicionChimenea: number
    finalizado: number
    direccionEmpuje: number
    posicionCabina: number
    empresaNombreSnapshot: number
    localidadNombreSnapshot: number
    viaOrigenNombreSnapshot: number
    viaDestinoNombreSnapshot: number
    seccionOrigenNombreSnapshot: number
    seccionDestinoNombreSnapshot: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MovimientoTorreonFerroAvgAggregateInputType = {
    id?: true
    empresaId?: true
    creadoPorId?: true
    clienteId?: true
    supervisorId?: true
    coordinadorId?: true
    operadorId?: true
    localidadId?: true
    viaOrigenId?: true
    viaDestinoId?: true
    seccionOrigenId?: true
    seccionDestinoId?: true
    locomotiveNumber?: true
  }

  export type MovimientoTorreonFerroSumAggregateInputType = {
    id?: true
    empresaId?: true
    creadoPorId?: true
    clienteId?: true
    supervisorId?: true
    coordinadorId?: true
    operadorId?: true
    localidadId?: true
    viaOrigenId?: true
    viaDestinoId?: true
    seccionOrigenId?: true
    seccionDestinoId?: true
    locomotiveNumber?: true
  }

  export type MovimientoTorreonFerroMinAggregateInputType = {
    id?: true
    empresaId?: true
    creadoPorId?: true
    clienteId?: true
    supervisorId?: true
    coordinadorId?: true
    operadorId?: true
    localidadId?: true
    viaOrigenId?: true
    viaDestinoId?: true
    seccionOrigenId?: true
    seccionDestinoId?: true
    locomotiveNumber?: true
    prioridad?: true
    tipoMovimiento?: true
    estado?: true
    fechaSolicitud?: true
    fechaInicio?: true
    fechaFin?: true
    fechaPausa?: true
    instrucciones?: true
    posicionChimenea?: true
    finalizado?: true
    direccionEmpuje?: true
    posicionCabina?: true
    empresaNombreSnapshot?: true
    localidadNombreSnapshot?: true
    viaOrigenNombreSnapshot?: true
    viaDestinoNombreSnapshot?: true
    seccionOrigenNombreSnapshot?: true
    seccionDestinoNombreSnapshot?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MovimientoTorreonFerroMaxAggregateInputType = {
    id?: true
    empresaId?: true
    creadoPorId?: true
    clienteId?: true
    supervisorId?: true
    coordinadorId?: true
    operadorId?: true
    localidadId?: true
    viaOrigenId?: true
    viaDestinoId?: true
    seccionOrigenId?: true
    seccionDestinoId?: true
    locomotiveNumber?: true
    prioridad?: true
    tipoMovimiento?: true
    estado?: true
    fechaSolicitud?: true
    fechaInicio?: true
    fechaFin?: true
    fechaPausa?: true
    instrucciones?: true
    posicionChimenea?: true
    finalizado?: true
    direccionEmpuje?: true
    posicionCabina?: true
    empresaNombreSnapshot?: true
    localidadNombreSnapshot?: true
    viaOrigenNombreSnapshot?: true
    viaDestinoNombreSnapshot?: true
    seccionOrigenNombreSnapshot?: true
    seccionDestinoNombreSnapshot?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MovimientoTorreonFerroCountAggregateInputType = {
    id?: true
    empresaId?: true
    creadoPorId?: true
    clienteId?: true
    supervisorId?: true
    coordinadorId?: true
    operadorId?: true
    localidadId?: true
    viaOrigenId?: true
    viaDestinoId?: true
    seccionOrigenId?: true
    seccionDestinoId?: true
    locomotiveNumber?: true
    prioridad?: true
    tipoMovimiento?: true
    estado?: true
    fechaSolicitud?: true
    fechaInicio?: true
    fechaFin?: true
    fechaPausa?: true
    instrucciones?: true
    posicionChimenea?: true
    finalizado?: true
    direccionEmpuje?: true
    posicionCabina?: true
    empresaNombreSnapshot?: true
    localidadNombreSnapshot?: true
    viaOrigenNombreSnapshot?: true
    viaDestinoNombreSnapshot?: true
    seccionOrigenNombreSnapshot?: true
    seccionDestinoNombreSnapshot?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MovimientoTorreonFerroAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MovimientoTorreonFerro to aggregate.
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFerros to fetch.
     */
    orderBy?: MovimientoTorreonFerroOrderByWithRelationInput | MovimientoTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MovimientoTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MovimientoTorreonFerros
    **/
    _count?: true | MovimientoTorreonFerroCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MovimientoTorreonFerroAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MovimientoTorreonFerroSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MovimientoTorreonFerroMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MovimientoTorreonFerroMaxAggregateInputType
  }

  export type GetMovimientoTorreonFerroAggregateType<T extends MovimientoTorreonFerroAggregateArgs> = {
        [P in keyof T & keyof AggregateMovimientoTorreonFerro]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMovimientoTorreonFerro[P]>
      : GetScalarType<T[P], AggregateMovimientoTorreonFerro[P]>
  }




  export type MovimientoTorreonFerroGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MovimientoTorreonFerroWhereInput
    orderBy?: MovimientoTorreonFerroOrderByWithAggregationInput | MovimientoTorreonFerroOrderByWithAggregationInput[]
    by: MovimientoTorreonFerroScalarFieldEnum[] | MovimientoTorreonFerroScalarFieldEnum
    having?: MovimientoTorreonFerroScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MovimientoTorreonFerroCountAggregateInputType | true
    _avg?: MovimientoTorreonFerroAvgAggregateInputType
    _sum?: MovimientoTorreonFerroSumAggregateInputType
    _min?: MovimientoTorreonFerroMinAggregateInputType
    _max?: MovimientoTorreonFerroMaxAggregateInputType
  }

  export type MovimientoTorreonFerroGroupByOutputType = {
    id: number
    empresaId: number
    creadoPorId: number
    clienteId: number | null
    supervisorId: number | null
    coordinadorId: number | null
    operadorId: number | null
    localidadId: number
    viaOrigenId: number | null
    viaDestinoId: number | null
    seccionOrigenId: number | null
    seccionDestinoId: number | null
    locomotiveNumber: number
    prioridad: $Enums.PrioridadTorreon
    tipoMovimiento: $Enums.TipoMovimientoTorreon | null
    estado: $Enums.EstadoMovimientoTorreon
    fechaSolicitud: Date
    fechaInicio: Date | null
    fechaFin: Date | null
    fechaPausa: Date | null
    instrucciones: string | null
    posicionChimenea: $Enums.PosicionChimeneaTorreon | null
    finalizado: boolean
    direccionEmpuje: $Enums.DireccionEmpujeTorreon | null
    posicionCabina: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot: string | null
    localidadNombreSnapshot: string | null
    viaOrigenNombreSnapshot: string | null
    viaDestinoNombreSnapshot: string | null
    seccionOrigenNombreSnapshot: string | null
    seccionDestinoNombreSnapshot: string | null
    createdAt: Date
    updatedAt: Date
    _count: MovimientoTorreonFerroCountAggregateOutputType | null
    _avg: MovimientoTorreonFerroAvgAggregateOutputType | null
    _sum: MovimientoTorreonFerroSumAggregateOutputType | null
    _min: MovimientoTorreonFerroMinAggregateOutputType | null
    _max: MovimientoTorreonFerroMaxAggregateOutputType | null
  }

  type GetMovimientoTorreonFerroGroupByPayload<T extends MovimientoTorreonFerroGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MovimientoTorreonFerroGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MovimientoTorreonFerroGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MovimientoTorreonFerroGroupByOutputType[P]>
            : GetScalarType<T[P], MovimientoTorreonFerroGroupByOutputType[P]>
        }
      >
    >


  export type MovimientoTorreonFerroSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    creadoPorId?: boolean
    clienteId?: boolean
    supervisorId?: boolean
    coordinadorId?: boolean
    operadorId?: boolean
    localidadId?: boolean
    viaOrigenId?: boolean
    viaDestinoId?: boolean
    seccionOrigenId?: boolean
    seccionDestinoId?: boolean
    locomotiveNumber?: boolean
    prioridad?: boolean
    tipoMovimiento?: boolean
    estado?: boolean
    fechaSolicitud?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    fechaPausa?: boolean
    instrucciones?: boolean
    posicionChimenea?: boolean
    finalizado?: boolean
    direccionEmpuje?: boolean
    posicionCabina?: boolean
    empresaNombreSnapshot?: boolean
    localidadNombreSnapshot?: boolean
    viaOrigenNombreSnapshot?: boolean
    viaDestinoNombreSnapshot?: boolean
    seccionOrigenNombreSnapshot?: boolean
    seccionDestinoNombreSnapshot?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    rondas?: boolean | MovimientoTorreonFerro$rondasArgs<ExtArgs>
    incidentes?: boolean | MovimientoTorreonFerro$incidentesArgs<ExtArgs>
    fotos?: boolean | MovimientoTorreonFerro$fotosArgs<ExtArgs>
    _count?: boolean | MovimientoTorreonFerroCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["movimientoTorreonFerro"]>

  export type MovimientoTorreonFerroSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    creadoPorId?: boolean
    clienteId?: boolean
    supervisorId?: boolean
    coordinadorId?: boolean
    operadorId?: boolean
    localidadId?: boolean
    viaOrigenId?: boolean
    viaDestinoId?: boolean
    seccionOrigenId?: boolean
    seccionDestinoId?: boolean
    locomotiveNumber?: boolean
    prioridad?: boolean
    tipoMovimiento?: boolean
    estado?: boolean
    fechaSolicitud?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    fechaPausa?: boolean
    instrucciones?: boolean
    posicionChimenea?: boolean
    finalizado?: boolean
    direccionEmpuje?: boolean
    posicionCabina?: boolean
    empresaNombreSnapshot?: boolean
    localidadNombreSnapshot?: boolean
    viaOrigenNombreSnapshot?: boolean
    viaDestinoNombreSnapshot?: boolean
    seccionOrigenNombreSnapshot?: boolean
    seccionDestinoNombreSnapshot?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["movimientoTorreonFerro"]>

  export type MovimientoTorreonFerroSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    creadoPorId?: boolean
    clienteId?: boolean
    supervisorId?: boolean
    coordinadorId?: boolean
    operadorId?: boolean
    localidadId?: boolean
    viaOrigenId?: boolean
    viaDestinoId?: boolean
    seccionOrigenId?: boolean
    seccionDestinoId?: boolean
    locomotiveNumber?: boolean
    prioridad?: boolean
    tipoMovimiento?: boolean
    estado?: boolean
    fechaSolicitud?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    fechaPausa?: boolean
    instrucciones?: boolean
    posicionChimenea?: boolean
    finalizado?: boolean
    direccionEmpuje?: boolean
    posicionCabina?: boolean
    empresaNombreSnapshot?: boolean
    localidadNombreSnapshot?: boolean
    viaOrigenNombreSnapshot?: boolean
    viaDestinoNombreSnapshot?: boolean
    seccionOrigenNombreSnapshot?: boolean
    seccionDestinoNombreSnapshot?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["movimientoTorreonFerro"]>

  export type MovimientoTorreonFerroSelectScalar = {
    id?: boolean
    empresaId?: boolean
    creadoPorId?: boolean
    clienteId?: boolean
    supervisorId?: boolean
    coordinadorId?: boolean
    operadorId?: boolean
    localidadId?: boolean
    viaOrigenId?: boolean
    viaDestinoId?: boolean
    seccionOrigenId?: boolean
    seccionDestinoId?: boolean
    locomotiveNumber?: boolean
    prioridad?: boolean
    tipoMovimiento?: boolean
    estado?: boolean
    fechaSolicitud?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    fechaPausa?: boolean
    instrucciones?: boolean
    posicionChimenea?: boolean
    finalizado?: boolean
    direccionEmpuje?: boolean
    posicionCabina?: boolean
    empresaNombreSnapshot?: boolean
    localidadNombreSnapshot?: boolean
    viaOrigenNombreSnapshot?: boolean
    viaDestinoNombreSnapshot?: boolean
    seccionOrigenNombreSnapshot?: boolean
    seccionDestinoNombreSnapshot?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MovimientoTorreonFerroOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "empresaId" | "creadoPorId" | "clienteId" | "supervisorId" | "coordinadorId" | "operadorId" | "localidadId" | "viaOrigenId" | "viaDestinoId" | "seccionOrigenId" | "seccionDestinoId" | "locomotiveNumber" | "prioridad" | "tipoMovimiento" | "estado" | "fechaSolicitud" | "fechaInicio" | "fechaFin" | "fechaPausa" | "instrucciones" | "posicionChimenea" | "finalizado" | "direccionEmpuje" | "posicionCabina" | "empresaNombreSnapshot" | "localidadNombreSnapshot" | "viaOrigenNombreSnapshot" | "viaDestinoNombreSnapshot" | "seccionOrigenNombreSnapshot" | "seccionDestinoNombreSnapshot" | "createdAt" | "updatedAt", ExtArgs["result"]["movimientoTorreonFerro"]>
  export type MovimientoTorreonFerroInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rondas?: boolean | MovimientoTorreonFerro$rondasArgs<ExtArgs>
    incidentes?: boolean | MovimientoTorreonFerro$incidentesArgs<ExtArgs>
    fotos?: boolean | MovimientoTorreonFerro$fotosArgs<ExtArgs>
    _count?: boolean | MovimientoTorreonFerroCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MovimientoTorreonFerroIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type MovimientoTorreonFerroIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $MovimientoTorreonFerroPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MovimientoTorreonFerro"
    objects: {
      rondas: Prisma.$RondaTorreonMovimientoPayload<ExtArgs>[]
      incidentes: Prisma.$IncidenteTorreonFerroPayload<ExtArgs>[]
      fotos: Prisma.$MovimientoTorreonFotoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      empresaId: number
      creadoPorId: number
      clienteId: number | null
      supervisorId: number | null
      coordinadorId: number | null
      operadorId: number | null
      localidadId: number
      viaOrigenId: number | null
      viaDestinoId: number | null
      seccionOrigenId: number | null
      seccionDestinoId: number | null
      locomotiveNumber: number
      prioridad: $Enums.PrioridadTorreon
      tipoMovimiento: $Enums.TipoMovimientoTorreon | null
      estado: $Enums.EstadoMovimientoTorreon
      fechaSolicitud: Date
      fechaInicio: Date | null
      fechaFin: Date | null
      fechaPausa: Date | null
      instrucciones: string | null
      posicionChimenea: $Enums.PosicionChimeneaTorreon | null
      finalizado: boolean
      direccionEmpuje: $Enums.DireccionEmpujeTorreon | null
      posicionCabina: $Enums.PosicionCabinaTorreon | null
      empresaNombreSnapshot: string | null
      localidadNombreSnapshot: string | null
      viaOrigenNombreSnapshot: string | null
      viaDestinoNombreSnapshot: string | null
      seccionOrigenNombreSnapshot: string | null
      seccionDestinoNombreSnapshot: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["movimientoTorreonFerro"]>
    composites: {}
  }

  type MovimientoTorreonFerroGetPayload<S extends boolean | null | undefined | MovimientoTorreonFerroDefaultArgs> = $Result.GetResult<Prisma.$MovimientoTorreonFerroPayload, S>

  type MovimientoTorreonFerroCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MovimientoTorreonFerroFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MovimientoTorreonFerroCountAggregateInputType | true
    }

  export interface MovimientoTorreonFerroDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MovimientoTorreonFerro'], meta: { name: 'MovimientoTorreonFerro' } }
    /**
     * Find zero or one MovimientoTorreonFerro that matches the filter.
     * @param {MovimientoTorreonFerroFindUniqueArgs} args - Arguments to find a MovimientoTorreonFerro
     * @example
     * // Get one MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MovimientoTorreonFerroFindUniqueArgs>(args: SelectSubset<T, MovimientoTorreonFerroFindUniqueArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MovimientoTorreonFerro that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MovimientoTorreonFerroFindUniqueOrThrowArgs} args - Arguments to find a MovimientoTorreonFerro
     * @example
     * // Get one MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MovimientoTorreonFerroFindUniqueOrThrowArgs>(args: SelectSubset<T, MovimientoTorreonFerroFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MovimientoTorreonFerro that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroFindFirstArgs} args - Arguments to find a MovimientoTorreonFerro
     * @example
     * // Get one MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MovimientoTorreonFerroFindFirstArgs>(args?: SelectSubset<T, MovimientoTorreonFerroFindFirstArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MovimientoTorreonFerro that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroFindFirstOrThrowArgs} args - Arguments to find a MovimientoTorreonFerro
     * @example
     * // Get one MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MovimientoTorreonFerroFindFirstOrThrowArgs>(args?: SelectSubset<T, MovimientoTorreonFerroFindFirstOrThrowArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MovimientoTorreonFerros that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MovimientoTorreonFerros
     * const movimientoTorreonFerros = await prisma.movimientoTorreonFerro.findMany()
     * 
     * // Get first 10 MovimientoTorreonFerros
     * const movimientoTorreonFerros = await prisma.movimientoTorreonFerro.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const movimientoTorreonFerroWithIdOnly = await prisma.movimientoTorreonFerro.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MovimientoTorreonFerroFindManyArgs>(args?: SelectSubset<T, MovimientoTorreonFerroFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MovimientoTorreonFerro.
     * @param {MovimientoTorreonFerroCreateArgs} args - Arguments to create a MovimientoTorreonFerro.
     * @example
     * // Create one MovimientoTorreonFerro
     * const MovimientoTorreonFerro = await prisma.movimientoTorreonFerro.create({
     *   data: {
     *     // ... data to create a MovimientoTorreonFerro
     *   }
     * })
     * 
     */
    create<T extends MovimientoTorreonFerroCreateArgs>(args: SelectSubset<T, MovimientoTorreonFerroCreateArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MovimientoTorreonFerros.
     * @param {MovimientoTorreonFerroCreateManyArgs} args - Arguments to create many MovimientoTorreonFerros.
     * @example
     * // Create many MovimientoTorreonFerros
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MovimientoTorreonFerroCreateManyArgs>(args?: SelectSubset<T, MovimientoTorreonFerroCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MovimientoTorreonFerros and returns the data saved in the database.
     * @param {MovimientoTorreonFerroCreateManyAndReturnArgs} args - Arguments to create many MovimientoTorreonFerros.
     * @example
     * // Create many MovimientoTorreonFerros
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MovimientoTorreonFerros and only return the `id`
     * const movimientoTorreonFerroWithIdOnly = await prisma.movimientoTorreonFerro.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MovimientoTorreonFerroCreateManyAndReturnArgs>(args?: SelectSubset<T, MovimientoTorreonFerroCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MovimientoTorreonFerro.
     * @param {MovimientoTorreonFerroDeleteArgs} args - Arguments to delete one MovimientoTorreonFerro.
     * @example
     * // Delete one MovimientoTorreonFerro
     * const MovimientoTorreonFerro = await prisma.movimientoTorreonFerro.delete({
     *   where: {
     *     // ... filter to delete one MovimientoTorreonFerro
     *   }
     * })
     * 
     */
    delete<T extends MovimientoTorreonFerroDeleteArgs>(args: SelectSubset<T, MovimientoTorreonFerroDeleteArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MovimientoTorreonFerro.
     * @param {MovimientoTorreonFerroUpdateArgs} args - Arguments to update one MovimientoTorreonFerro.
     * @example
     * // Update one MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MovimientoTorreonFerroUpdateArgs>(args: SelectSubset<T, MovimientoTorreonFerroUpdateArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MovimientoTorreonFerros.
     * @param {MovimientoTorreonFerroDeleteManyArgs} args - Arguments to filter MovimientoTorreonFerros to delete.
     * @example
     * // Delete a few MovimientoTorreonFerros
     * const { count } = await prisma.movimientoTorreonFerro.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MovimientoTorreonFerroDeleteManyArgs>(args?: SelectSubset<T, MovimientoTorreonFerroDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MovimientoTorreonFerros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MovimientoTorreonFerros
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MovimientoTorreonFerroUpdateManyArgs>(args: SelectSubset<T, MovimientoTorreonFerroUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MovimientoTorreonFerros and returns the data updated in the database.
     * @param {MovimientoTorreonFerroUpdateManyAndReturnArgs} args - Arguments to update many MovimientoTorreonFerros.
     * @example
     * // Update many MovimientoTorreonFerros
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MovimientoTorreonFerros and only return the `id`
     * const movimientoTorreonFerroWithIdOnly = await prisma.movimientoTorreonFerro.updateManyAndReturn({
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
    updateManyAndReturn<T extends MovimientoTorreonFerroUpdateManyAndReturnArgs>(args: SelectSubset<T, MovimientoTorreonFerroUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MovimientoTorreonFerro.
     * @param {MovimientoTorreonFerroUpsertArgs} args - Arguments to update or create a MovimientoTorreonFerro.
     * @example
     * // Update or create a MovimientoTorreonFerro
     * const movimientoTorreonFerro = await prisma.movimientoTorreonFerro.upsert({
     *   create: {
     *     // ... data to create a MovimientoTorreonFerro
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MovimientoTorreonFerro we want to update
     *   }
     * })
     */
    upsert<T extends MovimientoTorreonFerroUpsertArgs>(args: SelectSubset<T, MovimientoTorreonFerroUpsertArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MovimientoTorreonFerros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroCountArgs} args - Arguments to filter MovimientoTorreonFerros to count.
     * @example
     * // Count the number of MovimientoTorreonFerros
     * const count = await prisma.movimientoTorreonFerro.count({
     *   where: {
     *     // ... the filter for the MovimientoTorreonFerros we want to count
     *   }
     * })
    **/
    count<T extends MovimientoTorreonFerroCountArgs>(
      args?: Subset<T, MovimientoTorreonFerroCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MovimientoTorreonFerroCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MovimientoTorreonFerro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends MovimientoTorreonFerroAggregateArgs>(args: Subset<T, MovimientoTorreonFerroAggregateArgs>): Prisma.PrismaPromise<GetMovimientoTorreonFerroAggregateType<T>>

    /**
     * Group by MovimientoTorreonFerro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFerroGroupByArgs} args - Group by arguments.
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
      T extends MovimientoTorreonFerroGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MovimientoTorreonFerroGroupByArgs['orderBy'] }
        : { orderBy?: MovimientoTorreonFerroGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, MovimientoTorreonFerroGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMovimientoTorreonFerroGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MovimientoTorreonFerro model
   */
  readonly fields: MovimientoTorreonFerroFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MovimientoTorreonFerro.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MovimientoTorreonFerroClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    rondas<T extends MovimientoTorreonFerro$rondasArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerro$rondasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    incidentes<T extends MovimientoTorreonFerro$incidentesArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerro$incidentesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    fotos<T extends MovimientoTorreonFerro$fotosArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerro$fotosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Fields of the MovimientoTorreonFerro model
   */
  interface MovimientoTorreonFerroFieldRefs {
    readonly id: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly empresaId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly creadoPorId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly clienteId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly supervisorId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly coordinadorId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly operadorId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly localidadId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly viaOrigenId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly viaDestinoId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly seccionOrigenId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly seccionDestinoId: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly locomotiveNumber: FieldRef<"MovimientoTorreonFerro", 'Int'>
    readonly prioridad: FieldRef<"MovimientoTorreonFerro", 'PrioridadTorreon'>
    readonly tipoMovimiento: FieldRef<"MovimientoTorreonFerro", 'TipoMovimientoTorreon'>
    readonly estado: FieldRef<"MovimientoTorreonFerro", 'EstadoMovimientoTorreon'>
    readonly fechaSolicitud: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
    readonly fechaInicio: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
    readonly fechaFin: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
    readonly fechaPausa: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
    readonly instrucciones: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly posicionChimenea: FieldRef<"MovimientoTorreonFerro", 'PosicionChimeneaTorreon'>
    readonly finalizado: FieldRef<"MovimientoTorreonFerro", 'Boolean'>
    readonly direccionEmpuje: FieldRef<"MovimientoTorreonFerro", 'DireccionEmpujeTorreon'>
    readonly posicionCabina: FieldRef<"MovimientoTorreonFerro", 'PosicionCabinaTorreon'>
    readonly empresaNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly localidadNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly viaOrigenNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly viaDestinoNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly seccionOrigenNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly seccionDestinoNombreSnapshot: FieldRef<"MovimientoTorreonFerro", 'String'>
    readonly createdAt: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
    readonly updatedAt: FieldRef<"MovimientoTorreonFerro", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MovimientoTorreonFerro findUnique
   */
  export type MovimientoTorreonFerroFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFerro to fetch.
     */
    where: MovimientoTorreonFerroWhereUniqueInput
  }

  /**
   * MovimientoTorreonFerro findUniqueOrThrow
   */
  export type MovimientoTorreonFerroFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFerro to fetch.
     */
    where: MovimientoTorreonFerroWhereUniqueInput
  }

  /**
   * MovimientoTorreonFerro findFirst
   */
  export type MovimientoTorreonFerroFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFerro to fetch.
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFerros to fetch.
     */
    orderBy?: MovimientoTorreonFerroOrderByWithRelationInput | MovimientoTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MovimientoTorreonFerros.
     */
    cursor?: MovimientoTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MovimientoTorreonFerros.
     */
    distinct?: MovimientoTorreonFerroScalarFieldEnum | MovimientoTorreonFerroScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro findFirstOrThrow
   */
  export type MovimientoTorreonFerroFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFerro to fetch.
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFerros to fetch.
     */
    orderBy?: MovimientoTorreonFerroOrderByWithRelationInput | MovimientoTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MovimientoTorreonFerros.
     */
    cursor?: MovimientoTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MovimientoTorreonFerros.
     */
    distinct?: MovimientoTorreonFerroScalarFieldEnum | MovimientoTorreonFerroScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro findMany
   */
  export type MovimientoTorreonFerroFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFerros to fetch.
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFerros to fetch.
     */
    orderBy?: MovimientoTorreonFerroOrderByWithRelationInput | MovimientoTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MovimientoTorreonFerros.
     */
    cursor?: MovimientoTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFerros.
     */
    skip?: number
    distinct?: MovimientoTorreonFerroScalarFieldEnum | MovimientoTorreonFerroScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro create
   */
  export type MovimientoTorreonFerroCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * The data needed to create a MovimientoTorreonFerro.
     */
    data: XOR<MovimientoTorreonFerroCreateInput, MovimientoTorreonFerroUncheckedCreateInput>
  }

  /**
   * MovimientoTorreonFerro createMany
   */
  export type MovimientoTorreonFerroCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MovimientoTorreonFerros.
     */
    data: MovimientoTorreonFerroCreateManyInput | MovimientoTorreonFerroCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MovimientoTorreonFerro createManyAndReturn
   */
  export type MovimientoTorreonFerroCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * The data used to create many MovimientoTorreonFerros.
     */
    data: MovimientoTorreonFerroCreateManyInput | MovimientoTorreonFerroCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MovimientoTorreonFerro update
   */
  export type MovimientoTorreonFerroUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * The data needed to update a MovimientoTorreonFerro.
     */
    data: XOR<MovimientoTorreonFerroUpdateInput, MovimientoTorreonFerroUncheckedUpdateInput>
    /**
     * Choose, which MovimientoTorreonFerro to update.
     */
    where: MovimientoTorreonFerroWhereUniqueInput
  }

  /**
   * MovimientoTorreonFerro updateMany
   */
  export type MovimientoTorreonFerroUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MovimientoTorreonFerros.
     */
    data: XOR<MovimientoTorreonFerroUpdateManyMutationInput, MovimientoTorreonFerroUncheckedUpdateManyInput>
    /**
     * Filter which MovimientoTorreonFerros to update
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * Limit how many MovimientoTorreonFerros to update.
     */
    limit?: number
  }

  /**
   * MovimientoTorreonFerro updateManyAndReturn
   */
  export type MovimientoTorreonFerroUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * The data used to update MovimientoTorreonFerros.
     */
    data: XOR<MovimientoTorreonFerroUpdateManyMutationInput, MovimientoTorreonFerroUncheckedUpdateManyInput>
    /**
     * Filter which MovimientoTorreonFerros to update
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * Limit how many MovimientoTorreonFerros to update.
     */
    limit?: number
  }

  /**
   * MovimientoTorreonFerro upsert
   */
  export type MovimientoTorreonFerroUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * The filter to search for the MovimientoTorreonFerro to update in case it exists.
     */
    where: MovimientoTorreonFerroWhereUniqueInput
    /**
     * In case the MovimientoTorreonFerro found by the `where` argument doesn't exist, create a new MovimientoTorreonFerro with this data.
     */
    create: XOR<MovimientoTorreonFerroCreateInput, MovimientoTorreonFerroUncheckedCreateInput>
    /**
     * In case the MovimientoTorreonFerro was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MovimientoTorreonFerroUpdateInput, MovimientoTorreonFerroUncheckedUpdateInput>
  }

  /**
   * MovimientoTorreonFerro delete
   */
  export type MovimientoTorreonFerroDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter which MovimientoTorreonFerro to delete.
     */
    where: MovimientoTorreonFerroWhereUniqueInput
  }

  /**
   * MovimientoTorreonFerro deleteMany
   */
  export type MovimientoTorreonFerroDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MovimientoTorreonFerros to delete
     */
    where?: MovimientoTorreonFerroWhereInput
    /**
     * Limit how many MovimientoTorreonFerros to delete.
     */
    limit?: number
  }

  /**
   * MovimientoTorreonFerro.rondas
   */
  export type MovimientoTorreonFerro$rondasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    where?: RondaTorreonMovimientoWhereInput
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro.incidentes
   */
  export type MovimientoTorreonFerro$incidentesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    where?: IncidenteTorreonFerroWhereInput
    orderBy?: IncidenteTorreonFerroOrderByWithRelationInput | IncidenteTorreonFerroOrderByWithRelationInput[]
    cursor?: IncidenteTorreonFerroWhereUniqueInput
    take?: number
    skip?: number
    distinct?: IncidenteTorreonFerroScalarFieldEnum | IncidenteTorreonFerroScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro.fotos
   */
  export type MovimientoTorreonFerro$fotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    where?: MovimientoTorreonFotoWhereInput
    orderBy?: MovimientoTorreonFotoOrderByWithRelationInput | MovimientoTorreonFotoOrderByWithRelationInput[]
    cursor?: MovimientoTorreonFotoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MovimientoTorreonFotoScalarFieldEnum | MovimientoTorreonFotoScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFerro without action
   */
  export type MovimientoTorreonFerroDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFerro
     */
    select?: MovimientoTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFerro
     */
    omit?: MovimientoTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFerroInclude<ExtArgs> | null
  }


  /**
   * Model RondaTorreon
   */

  export type AggregateRondaTorreon = {
    _count: RondaTorreonCountAggregateOutputType | null
    _avg: RondaTorreonAvgAggregateOutputType | null
    _sum: RondaTorreonSumAggregateOutputType | null
    _min: RondaTorreonMinAggregateOutputType | null
    _max: RondaTorreonMaxAggregateOutputType | null
  }

  export type RondaTorreonAvgAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroRonda: number | null
  }

  export type RondaTorreonSumAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroRonda: number | null
  }

  export type RondaTorreonMinAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroRonda: number | null
    estado: $Enums.EstadoRondaTorreon | null
    fechaApertura: Date | null
    fechaCierre: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaTorreonMaxAggregateOutputType = {
    id: number | null
    localidadId: number | null
    numeroRonda: number | null
    estado: $Enums.EstadoRondaTorreon | null
    fechaApertura: Date | null
    fechaCierre: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaTorreonCountAggregateOutputType = {
    id: number
    localidadId: number
    numeroRonda: number
    estado: number
    fechaApertura: number
    fechaCierre: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RondaTorreonAvgAggregateInputType = {
    id?: true
    localidadId?: true
    numeroRonda?: true
  }

  export type RondaTorreonSumAggregateInputType = {
    id?: true
    localidadId?: true
    numeroRonda?: true
  }

  export type RondaTorreonMinAggregateInputType = {
    id?: true
    localidadId?: true
    numeroRonda?: true
    estado?: true
    fechaApertura?: true
    fechaCierre?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaTorreonMaxAggregateInputType = {
    id?: true
    localidadId?: true
    numeroRonda?: true
    estado?: true
    fechaApertura?: true
    fechaCierre?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaTorreonCountAggregateInputType = {
    id?: true
    localidadId?: true
    numeroRonda?: true
    estado?: true
    fechaApertura?: true
    fechaCierre?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RondaTorreonAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaTorreon to aggregate.
     */
    where?: RondaTorreonWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreons to fetch.
     */
    orderBy?: RondaTorreonOrderByWithRelationInput | RondaTorreonOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RondaTorreonWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreons from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreons.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RondaTorreons
    **/
    _count?: true | RondaTorreonCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RondaTorreonAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RondaTorreonSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RondaTorreonMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RondaTorreonMaxAggregateInputType
  }

  export type GetRondaTorreonAggregateType<T extends RondaTorreonAggregateArgs> = {
        [P in keyof T & keyof AggregateRondaTorreon]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRondaTorreon[P]>
      : GetScalarType<T[P], AggregateRondaTorreon[P]>
  }




  export type RondaTorreonGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaTorreonWhereInput
    orderBy?: RondaTorreonOrderByWithAggregationInput | RondaTorreonOrderByWithAggregationInput[]
    by: RondaTorreonScalarFieldEnum[] | RondaTorreonScalarFieldEnum
    having?: RondaTorreonScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RondaTorreonCountAggregateInputType | true
    _avg?: RondaTorreonAvgAggregateInputType
    _sum?: RondaTorreonSumAggregateInputType
    _min?: RondaTorreonMinAggregateInputType
    _max?: RondaTorreonMaxAggregateInputType
  }

  export type RondaTorreonGroupByOutputType = {
    id: number
    localidadId: number
    numeroRonda: number
    estado: $Enums.EstadoRondaTorreon
    fechaApertura: Date
    fechaCierre: Date | null
    createdAt: Date
    updatedAt: Date
    _count: RondaTorreonCountAggregateOutputType | null
    _avg: RondaTorreonAvgAggregateOutputType | null
    _sum: RondaTorreonSumAggregateOutputType | null
    _min: RondaTorreonMinAggregateOutputType | null
    _max: RondaTorreonMaxAggregateOutputType | null
  }

  type GetRondaTorreonGroupByPayload<T extends RondaTorreonGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RondaTorreonGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RondaTorreonGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RondaTorreonGroupByOutputType[P]>
            : GetScalarType<T[P], RondaTorreonGroupByOutputType[P]>
        }
      >
    >


  export type RondaTorreonSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroRonda?: boolean
    estado?: boolean
    fechaApertura?: boolean
    fechaCierre?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimientos?: boolean | RondaTorreon$movimientosArgs<ExtArgs>
    _count?: boolean | RondaTorreonCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rondaTorreon"]>

  export type RondaTorreonSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroRonda?: boolean
    estado?: boolean
    fechaApertura?: boolean
    fechaCierre?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rondaTorreon"]>

  export type RondaTorreonSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    localidadId?: boolean
    numeroRonda?: boolean
    estado?: boolean
    fechaApertura?: boolean
    fechaCierre?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rondaTorreon"]>

  export type RondaTorreonSelectScalar = {
    id?: boolean
    localidadId?: boolean
    numeroRonda?: boolean
    estado?: boolean
    fechaApertura?: boolean
    fechaCierre?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RondaTorreonOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "localidadId" | "numeroRonda" | "estado" | "fechaApertura" | "fechaCierre" | "createdAt" | "updatedAt", ExtArgs["result"]["rondaTorreon"]>
  export type RondaTorreonInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimientos?: boolean | RondaTorreon$movimientosArgs<ExtArgs>
    _count?: boolean | RondaTorreonCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RondaTorreonIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type RondaTorreonIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $RondaTorreonPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RondaTorreon"
    objects: {
      movimientos: Prisma.$RondaTorreonMovimientoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      localidadId: number
      numeroRonda: number
      estado: $Enums.EstadoRondaTorreon
      fechaApertura: Date
      fechaCierre: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rondaTorreon"]>
    composites: {}
  }

  type RondaTorreonGetPayload<S extends boolean | null | undefined | RondaTorreonDefaultArgs> = $Result.GetResult<Prisma.$RondaTorreonPayload, S>

  type RondaTorreonCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RondaTorreonFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RondaTorreonCountAggregateInputType | true
    }

  export interface RondaTorreonDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RondaTorreon'], meta: { name: 'RondaTorreon' } }
    /**
     * Find zero or one RondaTorreon that matches the filter.
     * @param {RondaTorreonFindUniqueArgs} args - Arguments to find a RondaTorreon
     * @example
     * // Get one RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RondaTorreonFindUniqueArgs>(args: SelectSubset<T, RondaTorreonFindUniqueArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RondaTorreon that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RondaTorreonFindUniqueOrThrowArgs} args - Arguments to find a RondaTorreon
     * @example
     * // Get one RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RondaTorreonFindUniqueOrThrowArgs>(args: SelectSubset<T, RondaTorreonFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaTorreon that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonFindFirstArgs} args - Arguments to find a RondaTorreon
     * @example
     * // Get one RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RondaTorreonFindFirstArgs>(args?: SelectSubset<T, RondaTorreonFindFirstArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaTorreon that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonFindFirstOrThrowArgs} args - Arguments to find a RondaTorreon
     * @example
     * // Get one RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RondaTorreonFindFirstOrThrowArgs>(args?: SelectSubset<T, RondaTorreonFindFirstOrThrowArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RondaTorreons that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RondaTorreons
     * const rondaTorreons = await prisma.rondaTorreon.findMany()
     * 
     * // Get first 10 RondaTorreons
     * const rondaTorreons = await prisma.rondaTorreon.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rondaTorreonWithIdOnly = await prisma.rondaTorreon.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RondaTorreonFindManyArgs>(args?: SelectSubset<T, RondaTorreonFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RondaTorreon.
     * @param {RondaTorreonCreateArgs} args - Arguments to create a RondaTorreon.
     * @example
     * // Create one RondaTorreon
     * const RondaTorreon = await prisma.rondaTorreon.create({
     *   data: {
     *     // ... data to create a RondaTorreon
     *   }
     * })
     * 
     */
    create<T extends RondaTorreonCreateArgs>(args: SelectSubset<T, RondaTorreonCreateArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RondaTorreons.
     * @param {RondaTorreonCreateManyArgs} args - Arguments to create many RondaTorreons.
     * @example
     * // Create many RondaTorreons
     * const rondaTorreon = await prisma.rondaTorreon.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RondaTorreonCreateManyArgs>(args?: SelectSubset<T, RondaTorreonCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RondaTorreons and returns the data saved in the database.
     * @param {RondaTorreonCreateManyAndReturnArgs} args - Arguments to create many RondaTorreons.
     * @example
     * // Create many RondaTorreons
     * const rondaTorreon = await prisma.rondaTorreon.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RondaTorreons and only return the `id`
     * const rondaTorreonWithIdOnly = await prisma.rondaTorreon.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RondaTorreonCreateManyAndReturnArgs>(args?: SelectSubset<T, RondaTorreonCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RondaTorreon.
     * @param {RondaTorreonDeleteArgs} args - Arguments to delete one RondaTorreon.
     * @example
     * // Delete one RondaTorreon
     * const RondaTorreon = await prisma.rondaTorreon.delete({
     *   where: {
     *     // ... filter to delete one RondaTorreon
     *   }
     * })
     * 
     */
    delete<T extends RondaTorreonDeleteArgs>(args: SelectSubset<T, RondaTorreonDeleteArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RondaTorreon.
     * @param {RondaTorreonUpdateArgs} args - Arguments to update one RondaTorreon.
     * @example
     * // Update one RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RondaTorreonUpdateArgs>(args: SelectSubset<T, RondaTorreonUpdateArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RondaTorreons.
     * @param {RondaTorreonDeleteManyArgs} args - Arguments to filter RondaTorreons to delete.
     * @example
     * // Delete a few RondaTorreons
     * const { count } = await prisma.rondaTorreon.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RondaTorreonDeleteManyArgs>(args?: SelectSubset<T, RondaTorreonDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaTorreons.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RondaTorreons
     * const rondaTorreon = await prisma.rondaTorreon.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RondaTorreonUpdateManyArgs>(args: SelectSubset<T, RondaTorreonUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaTorreons and returns the data updated in the database.
     * @param {RondaTorreonUpdateManyAndReturnArgs} args - Arguments to update many RondaTorreons.
     * @example
     * // Update many RondaTorreons
     * const rondaTorreon = await prisma.rondaTorreon.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RondaTorreons and only return the `id`
     * const rondaTorreonWithIdOnly = await prisma.rondaTorreon.updateManyAndReturn({
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
    updateManyAndReturn<T extends RondaTorreonUpdateManyAndReturnArgs>(args: SelectSubset<T, RondaTorreonUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RondaTorreon.
     * @param {RondaTorreonUpsertArgs} args - Arguments to update or create a RondaTorreon.
     * @example
     * // Update or create a RondaTorreon
     * const rondaTorreon = await prisma.rondaTorreon.upsert({
     *   create: {
     *     // ... data to create a RondaTorreon
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RondaTorreon we want to update
     *   }
     * })
     */
    upsert<T extends RondaTorreonUpsertArgs>(args: SelectSubset<T, RondaTorreonUpsertArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RondaTorreons.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonCountArgs} args - Arguments to filter RondaTorreons to count.
     * @example
     * // Count the number of RondaTorreons
     * const count = await prisma.rondaTorreon.count({
     *   where: {
     *     // ... the filter for the RondaTorreons we want to count
     *   }
     * })
    **/
    count<T extends RondaTorreonCountArgs>(
      args?: Subset<T, RondaTorreonCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RondaTorreonCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RondaTorreon.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RondaTorreonAggregateArgs>(args: Subset<T, RondaTorreonAggregateArgs>): Prisma.PrismaPromise<GetRondaTorreonAggregateType<T>>

    /**
     * Group by RondaTorreon.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonGroupByArgs} args - Group by arguments.
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
      T extends RondaTorreonGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RondaTorreonGroupByArgs['orderBy'] }
        : { orderBy?: RondaTorreonGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RondaTorreonGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRondaTorreonGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RondaTorreon model
   */
  readonly fields: RondaTorreonFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RondaTorreon.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RondaTorreonClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    movimientos<T extends RondaTorreon$movimientosArgs<ExtArgs> = {}>(args?: Subset<T, RondaTorreon$movimientosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Fields of the RondaTorreon model
   */
  interface RondaTorreonFieldRefs {
    readonly id: FieldRef<"RondaTorreon", 'Int'>
    readonly localidadId: FieldRef<"RondaTorreon", 'Int'>
    readonly numeroRonda: FieldRef<"RondaTorreon", 'Int'>
    readonly estado: FieldRef<"RondaTorreon", 'EstadoRondaTorreon'>
    readonly fechaApertura: FieldRef<"RondaTorreon", 'DateTime'>
    readonly fechaCierre: FieldRef<"RondaTorreon", 'DateTime'>
    readonly createdAt: FieldRef<"RondaTorreon", 'DateTime'>
    readonly updatedAt: FieldRef<"RondaTorreon", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RondaTorreon findUnique
   */
  export type RondaTorreonFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreon to fetch.
     */
    where: RondaTorreonWhereUniqueInput
  }

  /**
   * RondaTorreon findUniqueOrThrow
   */
  export type RondaTorreonFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreon to fetch.
     */
    where: RondaTorreonWhereUniqueInput
  }

  /**
   * RondaTorreon findFirst
   */
  export type RondaTorreonFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreon to fetch.
     */
    where?: RondaTorreonWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreons to fetch.
     */
    orderBy?: RondaTorreonOrderByWithRelationInput | RondaTorreonOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaTorreons.
     */
    cursor?: RondaTorreonWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreons from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreons.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaTorreons.
     */
    distinct?: RondaTorreonScalarFieldEnum | RondaTorreonScalarFieldEnum[]
  }

  /**
   * RondaTorreon findFirstOrThrow
   */
  export type RondaTorreonFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreon to fetch.
     */
    where?: RondaTorreonWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreons to fetch.
     */
    orderBy?: RondaTorreonOrderByWithRelationInput | RondaTorreonOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaTorreons.
     */
    cursor?: RondaTorreonWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreons from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreons.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaTorreons.
     */
    distinct?: RondaTorreonScalarFieldEnum | RondaTorreonScalarFieldEnum[]
  }

  /**
   * RondaTorreon findMany
   */
  export type RondaTorreonFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreons to fetch.
     */
    where?: RondaTorreonWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreons to fetch.
     */
    orderBy?: RondaTorreonOrderByWithRelationInput | RondaTorreonOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RondaTorreons.
     */
    cursor?: RondaTorreonWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreons from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreons.
     */
    skip?: number
    distinct?: RondaTorreonScalarFieldEnum | RondaTorreonScalarFieldEnum[]
  }

  /**
   * RondaTorreon create
   */
  export type RondaTorreonCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * The data needed to create a RondaTorreon.
     */
    data: XOR<RondaTorreonCreateInput, RondaTorreonUncheckedCreateInput>
  }

  /**
   * RondaTorreon createMany
   */
  export type RondaTorreonCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RondaTorreons.
     */
    data: RondaTorreonCreateManyInput | RondaTorreonCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RondaTorreon createManyAndReturn
   */
  export type RondaTorreonCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * The data used to create many RondaTorreons.
     */
    data: RondaTorreonCreateManyInput | RondaTorreonCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RondaTorreon update
   */
  export type RondaTorreonUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * The data needed to update a RondaTorreon.
     */
    data: XOR<RondaTorreonUpdateInput, RondaTorreonUncheckedUpdateInput>
    /**
     * Choose, which RondaTorreon to update.
     */
    where: RondaTorreonWhereUniqueInput
  }

  /**
   * RondaTorreon updateMany
   */
  export type RondaTorreonUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RondaTorreons.
     */
    data: XOR<RondaTorreonUpdateManyMutationInput, RondaTorreonUncheckedUpdateManyInput>
    /**
     * Filter which RondaTorreons to update
     */
    where?: RondaTorreonWhereInput
    /**
     * Limit how many RondaTorreons to update.
     */
    limit?: number
  }

  /**
   * RondaTorreon updateManyAndReturn
   */
  export type RondaTorreonUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * The data used to update RondaTorreons.
     */
    data: XOR<RondaTorreonUpdateManyMutationInput, RondaTorreonUncheckedUpdateManyInput>
    /**
     * Filter which RondaTorreons to update
     */
    where?: RondaTorreonWhereInput
    /**
     * Limit how many RondaTorreons to update.
     */
    limit?: number
  }

  /**
   * RondaTorreon upsert
   */
  export type RondaTorreonUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * The filter to search for the RondaTorreon to update in case it exists.
     */
    where: RondaTorreonWhereUniqueInput
    /**
     * In case the RondaTorreon found by the `where` argument doesn't exist, create a new RondaTorreon with this data.
     */
    create: XOR<RondaTorreonCreateInput, RondaTorreonUncheckedCreateInput>
    /**
     * In case the RondaTorreon was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RondaTorreonUpdateInput, RondaTorreonUncheckedUpdateInput>
  }

  /**
   * RondaTorreon delete
   */
  export type RondaTorreonDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
    /**
     * Filter which RondaTorreon to delete.
     */
    where: RondaTorreonWhereUniqueInput
  }

  /**
   * RondaTorreon deleteMany
   */
  export type RondaTorreonDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaTorreons to delete
     */
    where?: RondaTorreonWhereInput
    /**
     * Limit how many RondaTorreons to delete.
     */
    limit?: number
  }

  /**
   * RondaTorreon.movimientos
   */
  export type RondaTorreon$movimientosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    where?: RondaTorreonMovimientoWhereInput
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * RondaTorreon without action
   */
  export type RondaTorreonDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreon
     */
    select?: RondaTorreonSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreon
     */
    omit?: RondaTorreonOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonInclude<ExtArgs> | null
  }


  /**
   * Model RondaTorreonMovimiento
   */

  export type AggregateRondaTorreonMovimiento = {
    _count: RondaTorreonMovimientoCountAggregateOutputType | null
    _avg: RondaTorreonMovimientoAvgAggregateOutputType | null
    _sum: RondaTorreonMovimientoSumAggregateOutputType | null
    _min: RondaTorreonMovimientoMinAggregateOutputType | null
    _max: RondaTorreonMovimientoMaxAggregateOutputType | null
  }

  export type RondaTorreonMovimientoAvgAggregateOutputType = {
    id: number | null
    rondaId: number | null
    movimientoId: number | null
    bloqueadoPorIncidenteId: number | null
    empresaId: number | null
    orden: number | null
  }

  export type RondaTorreonMovimientoSumAggregateOutputType = {
    id: number | null
    rondaId: number | null
    movimientoId: number | null
    bloqueadoPorIncidenteId: number | null
    empresaId: number | null
    orden: number | null
  }

  export type RondaTorreonMovimientoMinAggregateOutputType = {
    id: number | null
    rondaId: number | null
    movimientoId: number | null
    bloqueadoPorIncidenteId: number | null
    empresaId: number | null
    orden: number | null
    prioridad: $Enums.PrioridadTorreon | null
    estado: $Enums.EstadoRondaMovimientoTorreon | null
    fechaAsignado: Date | null
    fechaInicio: Date | null
    fechaFin: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaTorreonMovimientoMaxAggregateOutputType = {
    id: number | null
    rondaId: number | null
    movimientoId: number | null
    bloqueadoPorIncidenteId: number | null
    empresaId: number | null
    orden: number | null
    prioridad: $Enums.PrioridadTorreon | null
    estado: $Enums.EstadoRondaMovimientoTorreon | null
    fechaAsignado: Date | null
    fechaInicio: Date | null
    fechaFin: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RondaTorreonMovimientoCountAggregateOutputType = {
    id: number
    rondaId: number
    movimientoId: number
    bloqueadoPorIncidenteId: number
    empresaId: number
    orden: number
    prioridad: number
    estado: number
    fechaAsignado: number
    fechaInicio: number
    fechaFin: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RondaTorreonMovimientoAvgAggregateInputType = {
    id?: true
    rondaId?: true
    movimientoId?: true
    bloqueadoPorIncidenteId?: true
    empresaId?: true
    orden?: true
  }

  export type RondaTorreonMovimientoSumAggregateInputType = {
    id?: true
    rondaId?: true
    movimientoId?: true
    bloqueadoPorIncidenteId?: true
    empresaId?: true
    orden?: true
  }

  export type RondaTorreonMovimientoMinAggregateInputType = {
    id?: true
    rondaId?: true
    movimientoId?: true
    bloqueadoPorIncidenteId?: true
    empresaId?: true
    orden?: true
    prioridad?: true
    estado?: true
    fechaAsignado?: true
    fechaInicio?: true
    fechaFin?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaTorreonMovimientoMaxAggregateInputType = {
    id?: true
    rondaId?: true
    movimientoId?: true
    bloqueadoPorIncidenteId?: true
    empresaId?: true
    orden?: true
    prioridad?: true
    estado?: true
    fechaAsignado?: true
    fechaInicio?: true
    fechaFin?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RondaTorreonMovimientoCountAggregateInputType = {
    id?: true
    rondaId?: true
    movimientoId?: true
    bloqueadoPorIncidenteId?: true
    empresaId?: true
    orden?: true
    prioridad?: true
    estado?: true
    fechaAsignado?: true
    fechaInicio?: true
    fechaFin?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RondaTorreonMovimientoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaTorreonMovimiento to aggregate.
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreonMovimientos to fetch.
     */
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreonMovimientos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreonMovimientos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RondaTorreonMovimientos
    **/
    _count?: true | RondaTorreonMovimientoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RondaTorreonMovimientoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RondaTorreonMovimientoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RondaTorreonMovimientoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RondaTorreonMovimientoMaxAggregateInputType
  }

  export type GetRondaTorreonMovimientoAggregateType<T extends RondaTorreonMovimientoAggregateArgs> = {
        [P in keyof T & keyof AggregateRondaTorreonMovimiento]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRondaTorreonMovimiento[P]>
      : GetScalarType<T[P], AggregateRondaTorreonMovimiento[P]>
  }




  export type RondaTorreonMovimientoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RondaTorreonMovimientoWhereInput
    orderBy?: RondaTorreonMovimientoOrderByWithAggregationInput | RondaTorreonMovimientoOrderByWithAggregationInput[]
    by: RondaTorreonMovimientoScalarFieldEnum[] | RondaTorreonMovimientoScalarFieldEnum
    having?: RondaTorreonMovimientoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RondaTorreonMovimientoCountAggregateInputType | true
    _avg?: RondaTorreonMovimientoAvgAggregateInputType
    _sum?: RondaTorreonMovimientoSumAggregateInputType
    _min?: RondaTorreonMovimientoMinAggregateInputType
    _max?: RondaTorreonMovimientoMaxAggregateInputType
  }

  export type RondaTorreonMovimientoGroupByOutputType = {
    id: number
    rondaId: number
    movimientoId: number
    bloqueadoPorIncidenteId: number | null
    empresaId: number
    orden: number
    prioridad: $Enums.PrioridadTorreon
    estado: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado: Date
    fechaInicio: Date | null
    fechaFin: Date | null
    createdAt: Date
    updatedAt: Date
    _count: RondaTorreonMovimientoCountAggregateOutputType | null
    _avg: RondaTorreonMovimientoAvgAggregateOutputType | null
    _sum: RondaTorreonMovimientoSumAggregateOutputType | null
    _min: RondaTorreonMovimientoMinAggregateOutputType | null
    _max: RondaTorreonMovimientoMaxAggregateOutputType | null
  }

  type GetRondaTorreonMovimientoGroupByPayload<T extends RondaTorreonMovimientoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RondaTorreonMovimientoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RondaTorreonMovimientoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RondaTorreonMovimientoGroupByOutputType[P]>
            : GetScalarType<T[P], RondaTorreonMovimientoGroupByOutputType[P]>
        }
      >
    >


  export type RondaTorreonMovimientoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaId?: boolean
    movimientoId?: boolean
    bloqueadoPorIncidenteId?: boolean
    empresaId?: boolean
    orden?: boolean
    prioridad?: boolean
    estado?: boolean
    fechaAsignado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }, ExtArgs["result"]["rondaTorreonMovimiento"]>

  export type RondaTorreonMovimientoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaId?: boolean
    movimientoId?: boolean
    bloqueadoPorIncidenteId?: boolean
    empresaId?: boolean
    orden?: boolean
    prioridad?: boolean
    estado?: boolean
    fechaAsignado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }, ExtArgs["result"]["rondaTorreonMovimiento"]>

  export type RondaTorreonMovimientoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    rondaId?: boolean
    movimientoId?: boolean
    bloqueadoPorIncidenteId?: boolean
    empresaId?: boolean
    orden?: boolean
    prioridad?: boolean
    estado?: boolean
    fechaAsignado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }, ExtArgs["result"]["rondaTorreonMovimiento"]>

  export type RondaTorreonMovimientoSelectScalar = {
    id?: boolean
    rondaId?: boolean
    movimientoId?: boolean
    bloqueadoPorIncidenteId?: boolean
    empresaId?: boolean
    orden?: boolean
    prioridad?: boolean
    estado?: boolean
    fechaAsignado?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RondaTorreonMovimientoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "rondaId" | "movimientoId" | "bloqueadoPorIncidenteId" | "empresaId" | "orden" | "prioridad" | "estado" | "fechaAsignado" | "fechaInicio" | "fechaFin" | "createdAt" | "updatedAt", ExtArgs["result"]["rondaTorreonMovimiento"]>
  export type RondaTorreonMovimientoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }
  export type RondaTorreonMovimientoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }
  export type RondaTorreonMovimientoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ronda?: boolean | RondaTorreonDefaultArgs<ExtArgs>
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    bloqueadoPorIncidente?: boolean | RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>
  }

  export type $RondaTorreonMovimientoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RondaTorreonMovimiento"
    objects: {
      ronda: Prisma.$RondaTorreonPayload<ExtArgs>
      movimiento: Prisma.$MovimientoTorreonFerroPayload<ExtArgs>
      bloqueadoPorIncidente: Prisma.$IncidenteTorreonFerroPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      rondaId: number
      movimientoId: number
      bloqueadoPorIncidenteId: number | null
      empresaId: number
      orden: number
      prioridad: $Enums.PrioridadTorreon
      estado: $Enums.EstadoRondaMovimientoTorreon
      fechaAsignado: Date
      fechaInicio: Date | null
      fechaFin: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rondaTorreonMovimiento"]>
    composites: {}
  }

  type RondaTorreonMovimientoGetPayload<S extends boolean | null | undefined | RondaTorreonMovimientoDefaultArgs> = $Result.GetResult<Prisma.$RondaTorreonMovimientoPayload, S>

  type RondaTorreonMovimientoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RondaTorreonMovimientoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RondaTorreonMovimientoCountAggregateInputType | true
    }

  export interface RondaTorreonMovimientoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RondaTorreonMovimiento'], meta: { name: 'RondaTorreonMovimiento' } }
    /**
     * Find zero or one RondaTorreonMovimiento that matches the filter.
     * @param {RondaTorreonMovimientoFindUniqueArgs} args - Arguments to find a RondaTorreonMovimiento
     * @example
     * // Get one RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RondaTorreonMovimientoFindUniqueArgs>(args: SelectSubset<T, RondaTorreonMovimientoFindUniqueArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RondaTorreonMovimiento that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RondaTorreonMovimientoFindUniqueOrThrowArgs} args - Arguments to find a RondaTorreonMovimiento
     * @example
     * // Get one RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RondaTorreonMovimientoFindUniqueOrThrowArgs>(args: SelectSubset<T, RondaTorreonMovimientoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaTorreonMovimiento that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoFindFirstArgs} args - Arguments to find a RondaTorreonMovimiento
     * @example
     * // Get one RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RondaTorreonMovimientoFindFirstArgs>(args?: SelectSubset<T, RondaTorreonMovimientoFindFirstArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RondaTorreonMovimiento that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoFindFirstOrThrowArgs} args - Arguments to find a RondaTorreonMovimiento
     * @example
     * // Get one RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RondaTorreonMovimientoFindFirstOrThrowArgs>(args?: SelectSubset<T, RondaTorreonMovimientoFindFirstOrThrowArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RondaTorreonMovimientos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RondaTorreonMovimientos
     * const rondaTorreonMovimientos = await prisma.rondaTorreonMovimiento.findMany()
     * 
     * // Get first 10 RondaTorreonMovimientos
     * const rondaTorreonMovimientos = await prisma.rondaTorreonMovimiento.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rondaTorreonMovimientoWithIdOnly = await prisma.rondaTorreonMovimiento.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RondaTorreonMovimientoFindManyArgs>(args?: SelectSubset<T, RondaTorreonMovimientoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RondaTorreonMovimiento.
     * @param {RondaTorreonMovimientoCreateArgs} args - Arguments to create a RondaTorreonMovimiento.
     * @example
     * // Create one RondaTorreonMovimiento
     * const RondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.create({
     *   data: {
     *     // ... data to create a RondaTorreonMovimiento
     *   }
     * })
     * 
     */
    create<T extends RondaTorreonMovimientoCreateArgs>(args: SelectSubset<T, RondaTorreonMovimientoCreateArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RondaTorreonMovimientos.
     * @param {RondaTorreonMovimientoCreateManyArgs} args - Arguments to create many RondaTorreonMovimientos.
     * @example
     * // Create many RondaTorreonMovimientos
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RondaTorreonMovimientoCreateManyArgs>(args?: SelectSubset<T, RondaTorreonMovimientoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RondaTorreonMovimientos and returns the data saved in the database.
     * @param {RondaTorreonMovimientoCreateManyAndReturnArgs} args - Arguments to create many RondaTorreonMovimientos.
     * @example
     * // Create many RondaTorreonMovimientos
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RondaTorreonMovimientos and only return the `id`
     * const rondaTorreonMovimientoWithIdOnly = await prisma.rondaTorreonMovimiento.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RondaTorreonMovimientoCreateManyAndReturnArgs>(args?: SelectSubset<T, RondaTorreonMovimientoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RondaTorreonMovimiento.
     * @param {RondaTorreonMovimientoDeleteArgs} args - Arguments to delete one RondaTorreonMovimiento.
     * @example
     * // Delete one RondaTorreonMovimiento
     * const RondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.delete({
     *   where: {
     *     // ... filter to delete one RondaTorreonMovimiento
     *   }
     * })
     * 
     */
    delete<T extends RondaTorreonMovimientoDeleteArgs>(args: SelectSubset<T, RondaTorreonMovimientoDeleteArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RondaTorreonMovimiento.
     * @param {RondaTorreonMovimientoUpdateArgs} args - Arguments to update one RondaTorreonMovimiento.
     * @example
     * // Update one RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RondaTorreonMovimientoUpdateArgs>(args: SelectSubset<T, RondaTorreonMovimientoUpdateArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RondaTorreonMovimientos.
     * @param {RondaTorreonMovimientoDeleteManyArgs} args - Arguments to filter RondaTorreonMovimientos to delete.
     * @example
     * // Delete a few RondaTorreonMovimientos
     * const { count } = await prisma.rondaTorreonMovimiento.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RondaTorreonMovimientoDeleteManyArgs>(args?: SelectSubset<T, RondaTorreonMovimientoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaTorreonMovimientos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RondaTorreonMovimientos
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RondaTorreonMovimientoUpdateManyArgs>(args: SelectSubset<T, RondaTorreonMovimientoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RondaTorreonMovimientos and returns the data updated in the database.
     * @param {RondaTorreonMovimientoUpdateManyAndReturnArgs} args - Arguments to update many RondaTorreonMovimientos.
     * @example
     * // Update many RondaTorreonMovimientos
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RondaTorreonMovimientos and only return the `id`
     * const rondaTorreonMovimientoWithIdOnly = await prisma.rondaTorreonMovimiento.updateManyAndReturn({
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
    updateManyAndReturn<T extends RondaTorreonMovimientoUpdateManyAndReturnArgs>(args: SelectSubset<T, RondaTorreonMovimientoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RondaTorreonMovimiento.
     * @param {RondaTorreonMovimientoUpsertArgs} args - Arguments to update or create a RondaTorreonMovimiento.
     * @example
     * // Update or create a RondaTorreonMovimiento
     * const rondaTorreonMovimiento = await prisma.rondaTorreonMovimiento.upsert({
     *   create: {
     *     // ... data to create a RondaTorreonMovimiento
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RondaTorreonMovimiento we want to update
     *   }
     * })
     */
    upsert<T extends RondaTorreonMovimientoUpsertArgs>(args: SelectSubset<T, RondaTorreonMovimientoUpsertArgs<ExtArgs>>): Prisma__RondaTorreonMovimientoClient<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RondaTorreonMovimientos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoCountArgs} args - Arguments to filter RondaTorreonMovimientos to count.
     * @example
     * // Count the number of RondaTorreonMovimientos
     * const count = await prisma.rondaTorreonMovimiento.count({
     *   where: {
     *     // ... the filter for the RondaTorreonMovimientos we want to count
     *   }
     * })
    **/
    count<T extends RondaTorreonMovimientoCountArgs>(
      args?: Subset<T, RondaTorreonMovimientoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RondaTorreonMovimientoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RondaTorreonMovimiento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RondaTorreonMovimientoAggregateArgs>(args: Subset<T, RondaTorreonMovimientoAggregateArgs>): Prisma.PrismaPromise<GetRondaTorreonMovimientoAggregateType<T>>

    /**
     * Group by RondaTorreonMovimiento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RondaTorreonMovimientoGroupByArgs} args - Group by arguments.
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
      T extends RondaTorreonMovimientoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RondaTorreonMovimientoGroupByArgs['orderBy'] }
        : { orderBy?: RondaTorreonMovimientoGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RondaTorreonMovimientoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRondaTorreonMovimientoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RondaTorreonMovimiento model
   */
  readonly fields: RondaTorreonMovimientoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RondaTorreonMovimiento.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RondaTorreonMovimientoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ronda<T extends RondaTorreonDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RondaTorreonDefaultArgs<ExtArgs>>): Prisma__RondaTorreonClient<$Result.GetResult<Prisma.$RondaTorreonPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    movimiento<T extends MovimientoTorreonFerroDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerroDefaultArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    bloqueadoPorIncidente<T extends RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs> = {}>(args?: Subset<T, RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
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
   * Fields of the RondaTorreonMovimiento model
   */
  interface RondaTorreonMovimientoFieldRefs {
    readonly id: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly rondaId: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly movimientoId: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly bloqueadoPorIncidenteId: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly empresaId: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly orden: FieldRef<"RondaTorreonMovimiento", 'Int'>
    readonly prioridad: FieldRef<"RondaTorreonMovimiento", 'PrioridadTorreon'>
    readonly estado: FieldRef<"RondaTorreonMovimiento", 'EstadoRondaMovimientoTorreon'>
    readonly fechaAsignado: FieldRef<"RondaTorreonMovimiento", 'DateTime'>
    readonly fechaInicio: FieldRef<"RondaTorreonMovimiento", 'DateTime'>
    readonly fechaFin: FieldRef<"RondaTorreonMovimiento", 'DateTime'>
    readonly createdAt: FieldRef<"RondaTorreonMovimiento", 'DateTime'>
    readonly updatedAt: FieldRef<"RondaTorreonMovimiento", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RondaTorreonMovimiento findUnique
   */
  export type RondaTorreonMovimientoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreonMovimiento to fetch.
     */
    where: RondaTorreonMovimientoWhereUniqueInput
  }

  /**
   * RondaTorreonMovimiento findUniqueOrThrow
   */
  export type RondaTorreonMovimientoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreonMovimiento to fetch.
     */
    where: RondaTorreonMovimientoWhereUniqueInput
  }

  /**
   * RondaTorreonMovimiento findFirst
   */
  export type RondaTorreonMovimientoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreonMovimiento to fetch.
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreonMovimientos to fetch.
     */
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaTorreonMovimientos.
     */
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreonMovimientos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreonMovimientos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaTorreonMovimientos.
     */
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * RondaTorreonMovimiento findFirstOrThrow
   */
  export type RondaTorreonMovimientoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreonMovimiento to fetch.
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreonMovimientos to fetch.
     */
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RondaTorreonMovimientos.
     */
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreonMovimientos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreonMovimientos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RondaTorreonMovimientos.
     */
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * RondaTorreonMovimiento findMany
   */
  export type RondaTorreonMovimientoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter, which RondaTorreonMovimientos to fetch.
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RondaTorreonMovimientos to fetch.
     */
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RondaTorreonMovimientos.
     */
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RondaTorreonMovimientos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RondaTorreonMovimientos.
     */
    skip?: number
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * RondaTorreonMovimiento create
   */
  export type RondaTorreonMovimientoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * The data needed to create a RondaTorreonMovimiento.
     */
    data: XOR<RondaTorreonMovimientoCreateInput, RondaTorreonMovimientoUncheckedCreateInput>
  }

  /**
   * RondaTorreonMovimiento createMany
   */
  export type RondaTorreonMovimientoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RondaTorreonMovimientos.
     */
    data: RondaTorreonMovimientoCreateManyInput | RondaTorreonMovimientoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RondaTorreonMovimiento createManyAndReturn
   */
  export type RondaTorreonMovimientoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * The data used to create many RondaTorreonMovimientos.
     */
    data: RondaTorreonMovimientoCreateManyInput | RondaTorreonMovimientoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RondaTorreonMovimiento update
   */
  export type RondaTorreonMovimientoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * The data needed to update a RondaTorreonMovimiento.
     */
    data: XOR<RondaTorreonMovimientoUpdateInput, RondaTorreonMovimientoUncheckedUpdateInput>
    /**
     * Choose, which RondaTorreonMovimiento to update.
     */
    where: RondaTorreonMovimientoWhereUniqueInput
  }

  /**
   * RondaTorreonMovimiento updateMany
   */
  export type RondaTorreonMovimientoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RondaTorreonMovimientos.
     */
    data: XOR<RondaTorreonMovimientoUpdateManyMutationInput, RondaTorreonMovimientoUncheckedUpdateManyInput>
    /**
     * Filter which RondaTorreonMovimientos to update
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * Limit how many RondaTorreonMovimientos to update.
     */
    limit?: number
  }

  /**
   * RondaTorreonMovimiento updateManyAndReturn
   */
  export type RondaTorreonMovimientoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * The data used to update RondaTorreonMovimientos.
     */
    data: XOR<RondaTorreonMovimientoUpdateManyMutationInput, RondaTorreonMovimientoUncheckedUpdateManyInput>
    /**
     * Filter which RondaTorreonMovimientos to update
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * Limit how many RondaTorreonMovimientos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RondaTorreonMovimiento upsert
   */
  export type RondaTorreonMovimientoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * The filter to search for the RondaTorreonMovimiento to update in case it exists.
     */
    where: RondaTorreonMovimientoWhereUniqueInput
    /**
     * In case the RondaTorreonMovimiento found by the `where` argument doesn't exist, create a new RondaTorreonMovimiento with this data.
     */
    create: XOR<RondaTorreonMovimientoCreateInput, RondaTorreonMovimientoUncheckedCreateInput>
    /**
     * In case the RondaTorreonMovimiento was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RondaTorreonMovimientoUpdateInput, RondaTorreonMovimientoUncheckedUpdateInput>
  }

  /**
   * RondaTorreonMovimiento delete
   */
  export type RondaTorreonMovimientoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    /**
     * Filter which RondaTorreonMovimiento to delete.
     */
    where: RondaTorreonMovimientoWhereUniqueInput
  }

  /**
   * RondaTorreonMovimiento deleteMany
   */
  export type RondaTorreonMovimientoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RondaTorreonMovimientos to delete
     */
    where?: RondaTorreonMovimientoWhereInput
    /**
     * Limit how many RondaTorreonMovimientos to delete.
     */
    limit?: number
  }

  /**
   * RondaTorreonMovimiento.bloqueadoPorIncidente
   */
  export type RondaTorreonMovimiento$bloqueadoPorIncidenteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    where?: IncidenteTorreonFerroWhereInput
  }

  /**
   * RondaTorreonMovimiento without action
   */
  export type RondaTorreonMovimientoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
  }


  /**
   * Model IncidenteTorreonFerro
   */

  export type AggregateIncidenteTorreonFerro = {
    _count: IncidenteTorreonFerroCountAggregateOutputType | null
    _avg: IncidenteTorreonFerroAvgAggregateOutputType | null
    _sum: IncidenteTorreonFerroSumAggregateOutputType | null
    _min: IncidenteTorreonFerroMinAggregateOutputType | null
    _max: IncidenteTorreonFerroMaxAggregateOutputType | null
  }

  export type IncidenteTorreonFerroAvgAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    creadoPorId: number | null
    resueltoPorId: number | null
    localidadId: number | null
    viaBloqueadaId: number | null
    seccionBloqueadaId: number | null
  }

  export type IncidenteTorreonFerroSumAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    creadoPorId: number | null
    resueltoPorId: number | null
    localidadId: number | null
    viaBloqueadaId: number | null
    seccionBloqueadaId: number | null
  }

  export type IncidenteTorreonFerroMinAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    creadoPorId: number | null
    resueltoPorId: number | null
    estado: $Enums.EstadoIncidenteTorreon | null
    motivo: string | null
    solucion: string | null
    localidadId: number | null
    viaBloqueadaId: number | null
    seccionBloqueadaId: number | null
    fechaInicio: Date | null
    fechaResolucion: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type IncidenteTorreonFerroMaxAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    creadoPorId: number | null
    resueltoPorId: number | null
    estado: $Enums.EstadoIncidenteTorreon | null
    motivo: string | null
    solucion: string | null
    localidadId: number | null
    viaBloqueadaId: number | null
    seccionBloqueadaId: number | null
    fechaInicio: Date | null
    fechaResolucion: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type IncidenteTorreonFerroCountAggregateOutputType = {
    id: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId: number
    estado: number
    motivo: number
    solucion: number
    localidadId: number
    viaBloqueadaId: number
    seccionBloqueadaId: number
    fechaInicio: number
    fechaResolucion: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type IncidenteTorreonFerroAvgAggregateInputType = {
    id?: true
    movimientoId?: true
    creadoPorId?: true
    resueltoPorId?: true
    localidadId?: true
    viaBloqueadaId?: true
    seccionBloqueadaId?: true
  }

  export type IncidenteTorreonFerroSumAggregateInputType = {
    id?: true
    movimientoId?: true
    creadoPorId?: true
    resueltoPorId?: true
    localidadId?: true
    viaBloqueadaId?: true
    seccionBloqueadaId?: true
  }

  export type IncidenteTorreonFerroMinAggregateInputType = {
    id?: true
    movimientoId?: true
    creadoPorId?: true
    resueltoPorId?: true
    estado?: true
    motivo?: true
    solucion?: true
    localidadId?: true
    viaBloqueadaId?: true
    seccionBloqueadaId?: true
    fechaInicio?: true
    fechaResolucion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type IncidenteTorreonFerroMaxAggregateInputType = {
    id?: true
    movimientoId?: true
    creadoPorId?: true
    resueltoPorId?: true
    estado?: true
    motivo?: true
    solucion?: true
    localidadId?: true
    viaBloqueadaId?: true
    seccionBloqueadaId?: true
    fechaInicio?: true
    fechaResolucion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type IncidenteTorreonFerroCountAggregateInputType = {
    id?: true
    movimientoId?: true
    creadoPorId?: true
    resueltoPorId?: true
    estado?: true
    motivo?: true
    solucion?: true
    localidadId?: true
    viaBloqueadaId?: true
    seccionBloqueadaId?: true
    fechaInicio?: true
    fechaResolucion?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type IncidenteTorreonFerroAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTorreonFerro to aggregate.
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFerros to fetch.
     */
    orderBy?: IncidenteTorreonFerroOrderByWithRelationInput | IncidenteTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IncidenteTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IncidenteTorreonFerros
    **/
    _count?: true | IncidenteTorreonFerroCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: IncidenteTorreonFerroAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: IncidenteTorreonFerroSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IncidenteTorreonFerroMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IncidenteTorreonFerroMaxAggregateInputType
  }

  export type GetIncidenteTorreonFerroAggregateType<T extends IncidenteTorreonFerroAggregateArgs> = {
        [P in keyof T & keyof AggregateIncidenteTorreonFerro]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIncidenteTorreonFerro[P]>
      : GetScalarType<T[P], AggregateIncidenteTorreonFerro[P]>
  }




  export type IncidenteTorreonFerroGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTorreonFerroWhereInput
    orderBy?: IncidenteTorreonFerroOrderByWithAggregationInput | IncidenteTorreonFerroOrderByWithAggregationInput[]
    by: IncidenteTorreonFerroScalarFieldEnum[] | IncidenteTorreonFerroScalarFieldEnum
    having?: IncidenteTorreonFerroScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IncidenteTorreonFerroCountAggregateInputType | true
    _avg?: IncidenteTorreonFerroAvgAggregateInputType
    _sum?: IncidenteTorreonFerroSumAggregateInputType
    _min?: IncidenteTorreonFerroMinAggregateInputType
    _max?: IncidenteTorreonFerroMaxAggregateInputType
  }

  export type IncidenteTorreonFerroGroupByOutputType = {
    id: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId: number | null
    estado: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion: string | null
    localidadId: number
    viaBloqueadaId: number | null
    seccionBloqueadaId: number | null
    fechaInicio: Date
    fechaResolucion: Date | null
    createdAt: Date
    updatedAt: Date
    _count: IncidenteTorreonFerroCountAggregateOutputType | null
    _avg: IncidenteTorreonFerroAvgAggregateOutputType | null
    _sum: IncidenteTorreonFerroSumAggregateOutputType | null
    _min: IncidenteTorreonFerroMinAggregateOutputType | null
    _max: IncidenteTorreonFerroMaxAggregateOutputType | null
  }

  type GetIncidenteTorreonFerroGroupByPayload<T extends IncidenteTorreonFerroGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IncidenteTorreonFerroGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IncidenteTorreonFerroGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IncidenteTorreonFerroGroupByOutputType[P]>
            : GetScalarType<T[P], IncidenteTorreonFerroGroupByOutputType[P]>
        }
      >
    >


  export type IncidenteTorreonFerroSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    creadoPorId?: boolean
    resueltoPorId?: boolean
    estado?: boolean
    motivo?: boolean
    solucion?: boolean
    localidadId?: boolean
    viaBloqueadaId?: boolean
    seccionBloqueadaId?: boolean
    fechaInicio?: boolean
    fechaResolucion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    rondasBloqueadas?: boolean | IncidenteTorreonFerro$rondasBloqueadasArgs<ExtArgs>
    fotos?: boolean | IncidenteTorreonFerro$fotosArgs<ExtArgs>
    _count?: boolean | IncidenteTorreonFerroCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFerro"]>

  export type IncidenteTorreonFerroSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    creadoPorId?: boolean
    resueltoPorId?: boolean
    estado?: boolean
    motivo?: boolean
    solucion?: boolean
    localidadId?: boolean
    viaBloqueadaId?: boolean
    seccionBloqueadaId?: boolean
    fechaInicio?: boolean
    fechaResolucion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFerro"]>

  export type IncidenteTorreonFerroSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    creadoPorId?: boolean
    resueltoPorId?: boolean
    estado?: boolean
    motivo?: boolean
    solucion?: boolean
    localidadId?: boolean
    viaBloqueadaId?: boolean
    seccionBloqueadaId?: boolean
    fechaInicio?: boolean
    fechaResolucion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFerro"]>

  export type IncidenteTorreonFerroSelectScalar = {
    id?: boolean
    movimientoId?: boolean
    creadoPorId?: boolean
    resueltoPorId?: boolean
    estado?: boolean
    motivo?: boolean
    solucion?: boolean
    localidadId?: boolean
    viaBloqueadaId?: boolean
    seccionBloqueadaId?: boolean
    fechaInicio?: boolean
    fechaResolucion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type IncidenteTorreonFerroOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "movimientoId" | "creadoPorId" | "resueltoPorId" | "estado" | "motivo" | "solucion" | "localidadId" | "viaBloqueadaId" | "seccionBloqueadaId" | "fechaInicio" | "fechaResolucion" | "createdAt" | "updatedAt", ExtArgs["result"]["incidenteTorreonFerro"]>
  export type IncidenteTorreonFerroInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
    rondasBloqueadas?: boolean | IncidenteTorreonFerro$rondasBloqueadasArgs<ExtArgs>
    fotos?: boolean | IncidenteTorreonFerro$fotosArgs<ExtArgs>
    _count?: boolean | IncidenteTorreonFerroCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type IncidenteTorreonFerroIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }
  export type IncidenteTorreonFerroIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }

  export type $IncidenteTorreonFerroPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IncidenteTorreonFerro"
    objects: {
      movimiento: Prisma.$MovimientoTorreonFerroPayload<ExtArgs>
      rondasBloqueadas: Prisma.$RondaTorreonMovimientoPayload<ExtArgs>[]
      fotos: Prisma.$IncidenteTorreonFotoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      movimientoId: number
      creadoPorId: number
      resueltoPorId: number | null
      estado: $Enums.EstadoIncidenteTorreon
      motivo: string
      solucion: string | null
      localidadId: number
      viaBloqueadaId: number | null
      seccionBloqueadaId: number | null
      fechaInicio: Date
      fechaResolucion: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["incidenteTorreonFerro"]>
    composites: {}
  }

  type IncidenteTorreonFerroGetPayload<S extends boolean | null | undefined | IncidenteTorreonFerroDefaultArgs> = $Result.GetResult<Prisma.$IncidenteTorreonFerroPayload, S>

  type IncidenteTorreonFerroCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IncidenteTorreonFerroFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IncidenteTorreonFerroCountAggregateInputType | true
    }

  export interface IncidenteTorreonFerroDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IncidenteTorreonFerro'], meta: { name: 'IncidenteTorreonFerro' } }
    /**
     * Find zero or one IncidenteTorreonFerro that matches the filter.
     * @param {IncidenteTorreonFerroFindUniqueArgs} args - Arguments to find a IncidenteTorreonFerro
     * @example
     * // Get one IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IncidenteTorreonFerroFindUniqueArgs>(args: SelectSubset<T, IncidenteTorreonFerroFindUniqueArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IncidenteTorreonFerro that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IncidenteTorreonFerroFindUniqueOrThrowArgs} args - Arguments to find a IncidenteTorreonFerro
     * @example
     * // Get one IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IncidenteTorreonFerroFindUniqueOrThrowArgs>(args: SelectSubset<T, IncidenteTorreonFerroFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorreonFerro that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroFindFirstArgs} args - Arguments to find a IncidenteTorreonFerro
     * @example
     * // Get one IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IncidenteTorreonFerroFindFirstArgs>(args?: SelectSubset<T, IncidenteTorreonFerroFindFirstArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorreonFerro that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroFindFirstOrThrowArgs} args - Arguments to find a IncidenteTorreonFerro
     * @example
     * // Get one IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IncidenteTorreonFerroFindFirstOrThrowArgs>(args?: SelectSubset<T, IncidenteTorreonFerroFindFirstOrThrowArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IncidenteTorreonFerros that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IncidenteTorreonFerros
     * const incidenteTorreonFerros = await prisma.incidenteTorreonFerro.findMany()
     * 
     * // Get first 10 IncidenteTorreonFerros
     * const incidenteTorreonFerros = await prisma.incidenteTorreonFerro.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const incidenteTorreonFerroWithIdOnly = await prisma.incidenteTorreonFerro.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IncidenteTorreonFerroFindManyArgs>(args?: SelectSubset<T, IncidenteTorreonFerroFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IncidenteTorreonFerro.
     * @param {IncidenteTorreonFerroCreateArgs} args - Arguments to create a IncidenteTorreonFerro.
     * @example
     * // Create one IncidenteTorreonFerro
     * const IncidenteTorreonFerro = await prisma.incidenteTorreonFerro.create({
     *   data: {
     *     // ... data to create a IncidenteTorreonFerro
     *   }
     * })
     * 
     */
    create<T extends IncidenteTorreonFerroCreateArgs>(args: SelectSubset<T, IncidenteTorreonFerroCreateArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IncidenteTorreonFerros.
     * @param {IncidenteTorreonFerroCreateManyArgs} args - Arguments to create many IncidenteTorreonFerros.
     * @example
     * // Create many IncidenteTorreonFerros
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IncidenteTorreonFerroCreateManyArgs>(args?: SelectSubset<T, IncidenteTorreonFerroCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many IncidenteTorreonFerros and returns the data saved in the database.
     * @param {IncidenteTorreonFerroCreateManyAndReturnArgs} args - Arguments to create many IncidenteTorreonFerros.
     * @example
     * // Create many IncidenteTorreonFerros
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many IncidenteTorreonFerros and only return the `id`
     * const incidenteTorreonFerroWithIdOnly = await prisma.incidenteTorreonFerro.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends IncidenteTorreonFerroCreateManyAndReturnArgs>(args?: SelectSubset<T, IncidenteTorreonFerroCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a IncidenteTorreonFerro.
     * @param {IncidenteTorreonFerroDeleteArgs} args - Arguments to delete one IncidenteTorreonFerro.
     * @example
     * // Delete one IncidenteTorreonFerro
     * const IncidenteTorreonFerro = await prisma.incidenteTorreonFerro.delete({
     *   where: {
     *     // ... filter to delete one IncidenteTorreonFerro
     *   }
     * })
     * 
     */
    delete<T extends IncidenteTorreonFerroDeleteArgs>(args: SelectSubset<T, IncidenteTorreonFerroDeleteArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IncidenteTorreonFerro.
     * @param {IncidenteTorreonFerroUpdateArgs} args - Arguments to update one IncidenteTorreonFerro.
     * @example
     * // Update one IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IncidenteTorreonFerroUpdateArgs>(args: SelectSubset<T, IncidenteTorreonFerroUpdateArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IncidenteTorreonFerros.
     * @param {IncidenteTorreonFerroDeleteManyArgs} args - Arguments to filter IncidenteTorreonFerros to delete.
     * @example
     * // Delete a few IncidenteTorreonFerros
     * const { count } = await prisma.incidenteTorreonFerro.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IncidenteTorreonFerroDeleteManyArgs>(args?: SelectSubset<T, IncidenteTorreonFerroDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTorreonFerros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IncidenteTorreonFerros
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IncidenteTorreonFerroUpdateManyArgs>(args: SelectSubset<T, IncidenteTorreonFerroUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTorreonFerros and returns the data updated in the database.
     * @param {IncidenteTorreonFerroUpdateManyAndReturnArgs} args - Arguments to update many IncidenteTorreonFerros.
     * @example
     * // Update many IncidenteTorreonFerros
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more IncidenteTorreonFerros and only return the `id`
     * const incidenteTorreonFerroWithIdOnly = await prisma.incidenteTorreonFerro.updateManyAndReturn({
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
    updateManyAndReturn<T extends IncidenteTorreonFerroUpdateManyAndReturnArgs>(args: SelectSubset<T, IncidenteTorreonFerroUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one IncidenteTorreonFerro.
     * @param {IncidenteTorreonFerroUpsertArgs} args - Arguments to update or create a IncidenteTorreonFerro.
     * @example
     * // Update or create a IncidenteTorreonFerro
     * const incidenteTorreonFerro = await prisma.incidenteTorreonFerro.upsert({
     *   create: {
     *     // ... data to create a IncidenteTorreonFerro
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IncidenteTorreonFerro we want to update
     *   }
     * })
     */
    upsert<T extends IncidenteTorreonFerroUpsertArgs>(args: SelectSubset<T, IncidenteTorreonFerroUpsertArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of IncidenteTorreonFerros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroCountArgs} args - Arguments to filter IncidenteTorreonFerros to count.
     * @example
     * // Count the number of IncidenteTorreonFerros
     * const count = await prisma.incidenteTorreonFerro.count({
     *   where: {
     *     // ... the filter for the IncidenteTorreonFerros we want to count
     *   }
     * })
    **/
    count<T extends IncidenteTorreonFerroCountArgs>(
      args?: Subset<T, IncidenteTorreonFerroCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IncidenteTorreonFerroCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IncidenteTorreonFerro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends IncidenteTorreonFerroAggregateArgs>(args: Subset<T, IncidenteTorreonFerroAggregateArgs>): Prisma.PrismaPromise<GetIncidenteTorreonFerroAggregateType<T>>

    /**
     * Group by IncidenteTorreonFerro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFerroGroupByArgs} args - Group by arguments.
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
      T extends IncidenteTorreonFerroGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IncidenteTorreonFerroGroupByArgs['orderBy'] }
        : { orderBy?: IncidenteTorreonFerroGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, IncidenteTorreonFerroGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIncidenteTorreonFerroGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IncidenteTorreonFerro model
   */
  readonly fields: IncidenteTorreonFerroFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IncidenteTorreonFerro.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IncidenteTorreonFerroClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    movimiento<T extends MovimientoTorreonFerroDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerroDefaultArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rondasBloqueadas<T extends IncidenteTorreonFerro$rondasBloqueadasArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorreonFerro$rondasBloqueadasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RondaTorreonMovimientoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    fotos<T extends IncidenteTorreonFerro$fotosArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorreonFerro$fotosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Fields of the IncidenteTorreonFerro model
   */
  interface IncidenteTorreonFerroFieldRefs {
    readonly id: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly movimientoId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly creadoPorId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly resueltoPorId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly estado: FieldRef<"IncidenteTorreonFerro", 'EstadoIncidenteTorreon'>
    readonly motivo: FieldRef<"IncidenteTorreonFerro", 'String'>
    readonly solucion: FieldRef<"IncidenteTorreonFerro", 'String'>
    readonly localidadId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly viaBloqueadaId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly seccionBloqueadaId: FieldRef<"IncidenteTorreonFerro", 'Int'>
    readonly fechaInicio: FieldRef<"IncidenteTorreonFerro", 'DateTime'>
    readonly fechaResolucion: FieldRef<"IncidenteTorreonFerro", 'DateTime'>
    readonly createdAt: FieldRef<"IncidenteTorreonFerro", 'DateTime'>
    readonly updatedAt: FieldRef<"IncidenteTorreonFerro", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * IncidenteTorreonFerro findUnique
   */
  export type IncidenteTorreonFerroFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFerro to fetch.
     */
    where: IncidenteTorreonFerroWhereUniqueInput
  }

  /**
   * IncidenteTorreonFerro findUniqueOrThrow
   */
  export type IncidenteTorreonFerroFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFerro to fetch.
     */
    where: IncidenteTorreonFerroWhereUniqueInput
  }

  /**
   * IncidenteTorreonFerro findFirst
   */
  export type IncidenteTorreonFerroFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFerro to fetch.
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFerros to fetch.
     */
    orderBy?: IncidenteTorreonFerroOrderByWithRelationInput | IncidenteTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTorreonFerros.
     */
    cursor?: IncidenteTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTorreonFerros.
     */
    distinct?: IncidenteTorreonFerroScalarFieldEnum | IncidenteTorreonFerroScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFerro findFirstOrThrow
   */
  export type IncidenteTorreonFerroFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFerro to fetch.
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFerros to fetch.
     */
    orderBy?: IncidenteTorreonFerroOrderByWithRelationInput | IncidenteTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTorreonFerros.
     */
    cursor?: IncidenteTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFerros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTorreonFerros.
     */
    distinct?: IncidenteTorreonFerroScalarFieldEnum | IncidenteTorreonFerroScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFerro findMany
   */
  export type IncidenteTorreonFerroFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFerros to fetch.
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFerros to fetch.
     */
    orderBy?: IncidenteTorreonFerroOrderByWithRelationInput | IncidenteTorreonFerroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IncidenteTorreonFerros.
     */
    cursor?: IncidenteTorreonFerroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFerros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFerros.
     */
    skip?: number
    distinct?: IncidenteTorreonFerroScalarFieldEnum | IncidenteTorreonFerroScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFerro create
   */
  export type IncidenteTorreonFerroCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * The data needed to create a IncidenteTorreonFerro.
     */
    data: XOR<IncidenteTorreonFerroCreateInput, IncidenteTorreonFerroUncheckedCreateInput>
  }

  /**
   * IncidenteTorreonFerro createMany
   */
  export type IncidenteTorreonFerroCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IncidenteTorreonFerros.
     */
    data: IncidenteTorreonFerroCreateManyInput | IncidenteTorreonFerroCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * IncidenteTorreonFerro createManyAndReturn
   */
  export type IncidenteTorreonFerroCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * The data used to create many IncidenteTorreonFerros.
     */
    data: IncidenteTorreonFerroCreateManyInput | IncidenteTorreonFerroCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorreonFerro update
   */
  export type IncidenteTorreonFerroUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * The data needed to update a IncidenteTorreonFerro.
     */
    data: XOR<IncidenteTorreonFerroUpdateInput, IncidenteTorreonFerroUncheckedUpdateInput>
    /**
     * Choose, which IncidenteTorreonFerro to update.
     */
    where: IncidenteTorreonFerroWhereUniqueInput
  }

  /**
   * IncidenteTorreonFerro updateMany
   */
  export type IncidenteTorreonFerroUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IncidenteTorreonFerros.
     */
    data: XOR<IncidenteTorreonFerroUpdateManyMutationInput, IncidenteTorreonFerroUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTorreonFerros to update
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * Limit how many IncidenteTorreonFerros to update.
     */
    limit?: number
  }

  /**
   * IncidenteTorreonFerro updateManyAndReturn
   */
  export type IncidenteTorreonFerroUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * The data used to update IncidenteTorreonFerros.
     */
    data: XOR<IncidenteTorreonFerroUpdateManyMutationInput, IncidenteTorreonFerroUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTorreonFerros to update
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * Limit how many IncidenteTorreonFerros to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorreonFerro upsert
   */
  export type IncidenteTorreonFerroUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * The filter to search for the IncidenteTorreonFerro to update in case it exists.
     */
    where: IncidenteTorreonFerroWhereUniqueInput
    /**
     * In case the IncidenteTorreonFerro found by the `where` argument doesn't exist, create a new IncidenteTorreonFerro with this data.
     */
    create: XOR<IncidenteTorreonFerroCreateInput, IncidenteTorreonFerroUncheckedCreateInput>
    /**
     * In case the IncidenteTorreonFerro was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IncidenteTorreonFerroUpdateInput, IncidenteTorreonFerroUncheckedUpdateInput>
  }

  /**
   * IncidenteTorreonFerro delete
   */
  export type IncidenteTorreonFerroDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
    /**
     * Filter which IncidenteTorreonFerro to delete.
     */
    where: IncidenteTorreonFerroWhereUniqueInput
  }

  /**
   * IncidenteTorreonFerro deleteMany
   */
  export type IncidenteTorreonFerroDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTorreonFerros to delete
     */
    where?: IncidenteTorreonFerroWhereInput
    /**
     * Limit how many IncidenteTorreonFerros to delete.
     */
    limit?: number
  }

  /**
   * IncidenteTorreonFerro.rondasBloqueadas
   */
  export type IncidenteTorreonFerro$rondasBloqueadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RondaTorreonMovimiento
     */
    select?: RondaTorreonMovimientoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RondaTorreonMovimiento
     */
    omit?: RondaTorreonMovimientoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RondaTorreonMovimientoInclude<ExtArgs> | null
    where?: RondaTorreonMovimientoWhereInput
    orderBy?: RondaTorreonMovimientoOrderByWithRelationInput | RondaTorreonMovimientoOrderByWithRelationInput[]
    cursor?: RondaTorreonMovimientoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RondaTorreonMovimientoScalarFieldEnum | RondaTorreonMovimientoScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFerro.fotos
   */
  export type IncidenteTorreonFerro$fotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    where?: IncidenteTorreonFotoWhereInput
    orderBy?: IncidenteTorreonFotoOrderByWithRelationInput | IncidenteTorreonFotoOrderByWithRelationInput[]
    cursor?: IncidenteTorreonFotoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: IncidenteTorreonFotoScalarFieldEnum | IncidenteTorreonFotoScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFerro without action
   */
  export type IncidenteTorreonFerroDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFerro
     */
    select?: IncidenteTorreonFerroSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFerro
     */
    omit?: IncidenteTorreonFerroOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFerroInclude<ExtArgs> | null
  }


  /**
   * Model MovimientoTorreonFoto
   */

  export type AggregateMovimientoTorreonFoto = {
    _count: MovimientoTorreonFotoCountAggregateOutputType | null
    _avg: MovimientoTorreonFotoAvgAggregateOutputType | null
    _sum: MovimientoTorreonFotoSumAggregateOutputType | null
    _min: MovimientoTorreonFotoMinAggregateOutputType | null
    _max: MovimientoTorreonFotoMaxAggregateOutputType | null
  }

  export type MovimientoTorreonFotoAvgAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    orden: number | null
    tomadaPorId: number | null
  }

  export type MovimientoTorreonFotoSumAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    orden: number | null
    tomadaPorId: number | null
  }

  export type MovimientoTorreonFotoMinAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    tipo: $Enums.TipoFotoMovimientoTorreon | null
    orden: number | null
    url: string | null
    storageKey: string | null
    tomadaPorId: number | null
    comentario: string | null
    tomadaAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MovimientoTorreonFotoMaxAggregateOutputType = {
    id: number | null
    movimientoId: number | null
    tipo: $Enums.TipoFotoMovimientoTorreon | null
    orden: number | null
    url: string | null
    storageKey: string | null
    tomadaPorId: number | null
    comentario: string | null
    tomadaAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MovimientoTorreonFotoCountAggregateOutputType = {
    id: number
    movimientoId: number
    tipo: number
    orden: number
    url: number
    storageKey: number
    tomadaPorId: number
    comentario: number
    tomadaAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MovimientoTorreonFotoAvgAggregateInputType = {
    id?: true
    movimientoId?: true
    orden?: true
    tomadaPorId?: true
  }

  export type MovimientoTorreonFotoSumAggregateInputType = {
    id?: true
    movimientoId?: true
    orden?: true
    tomadaPorId?: true
  }

  export type MovimientoTorreonFotoMinAggregateInputType = {
    id?: true
    movimientoId?: true
    tipo?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MovimientoTorreonFotoMaxAggregateInputType = {
    id?: true
    movimientoId?: true
    tipo?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MovimientoTorreonFotoCountAggregateInputType = {
    id?: true
    movimientoId?: true
    tipo?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MovimientoTorreonFotoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MovimientoTorreonFoto to aggregate.
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFotos to fetch.
     */
    orderBy?: MovimientoTorreonFotoOrderByWithRelationInput | MovimientoTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MovimientoTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MovimientoTorreonFotos
    **/
    _count?: true | MovimientoTorreonFotoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MovimientoTorreonFotoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MovimientoTorreonFotoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MovimientoTorreonFotoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MovimientoTorreonFotoMaxAggregateInputType
  }

  export type GetMovimientoTorreonFotoAggregateType<T extends MovimientoTorreonFotoAggregateArgs> = {
        [P in keyof T & keyof AggregateMovimientoTorreonFoto]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMovimientoTorreonFoto[P]>
      : GetScalarType<T[P], AggregateMovimientoTorreonFoto[P]>
  }




  export type MovimientoTorreonFotoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MovimientoTorreonFotoWhereInput
    orderBy?: MovimientoTorreonFotoOrderByWithAggregationInput | MovimientoTorreonFotoOrderByWithAggregationInput[]
    by: MovimientoTorreonFotoScalarFieldEnum[] | MovimientoTorreonFotoScalarFieldEnum
    having?: MovimientoTorreonFotoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MovimientoTorreonFotoCountAggregateInputType | true
    _avg?: MovimientoTorreonFotoAvgAggregateInputType
    _sum?: MovimientoTorreonFotoSumAggregateInputType
    _min?: MovimientoTorreonFotoMinAggregateInputType
    _max?: MovimientoTorreonFotoMaxAggregateInputType
  }

  export type MovimientoTorreonFotoGroupByOutputType = {
    id: number
    movimientoId: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden: number
    url: string
    storageKey: string | null
    tomadaPorId: number
    comentario: string | null
    tomadaAt: Date
    createdAt: Date
    updatedAt: Date
    _count: MovimientoTorreonFotoCountAggregateOutputType | null
    _avg: MovimientoTorreonFotoAvgAggregateOutputType | null
    _sum: MovimientoTorreonFotoSumAggregateOutputType | null
    _min: MovimientoTorreonFotoMinAggregateOutputType | null
    _max: MovimientoTorreonFotoMaxAggregateOutputType | null
  }

  type GetMovimientoTorreonFotoGroupByPayload<T extends MovimientoTorreonFotoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MovimientoTorreonFotoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MovimientoTorreonFotoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MovimientoTorreonFotoGroupByOutputType[P]>
            : GetScalarType<T[P], MovimientoTorreonFotoGroupByOutputType[P]>
        }
      >
    >


  export type MovimientoTorreonFotoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    tipo?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["movimientoTorreonFoto"]>

  export type MovimientoTorreonFotoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    tipo?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["movimientoTorreonFoto"]>

  export type MovimientoTorreonFotoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movimientoId?: boolean
    tipo?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["movimientoTorreonFoto"]>

  export type MovimientoTorreonFotoSelectScalar = {
    id?: boolean
    movimientoId?: boolean
    tipo?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MovimientoTorreonFotoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "movimientoId" | "tipo" | "orden" | "url" | "storageKey" | "tomadaPorId" | "comentario" | "tomadaAt" | "createdAt" | "updatedAt", ExtArgs["result"]["movimientoTorreonFoto"]>
  export type MovimientoTorreonFotoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }
  export type MovimientoTorreonFotoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }
  export type MovimientoTorreonFotoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movimiento?: boolean | MovimientoTorreonFerroDefaultArgs<ExtArgs>
  }

  export type $MovimientoTorreonFotoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MovimientoTorreonFoto"
    objects: {
      movimiento: Prisma.$MovimientoTorreonFerroPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      movimientoId: number
      tipo: $Enums.TipoFotoMovimientoTorreon
      orden: number
      url: string
      storageKey: string | null
      tomadaPorId: number
      comentario: string | null
      tomadaAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["movimientoTorreonFoto"]>
    composites: {}
  }

  type MovimientoTorreonFotoGetPayload<S extends boolean | null | undefined | MovimientoTorreonFotoDefaultArgs> = $Result.GetResult<Prisma.$MovimientoTorreonFotoPayload, S>

  type MovimientoTorreonFotoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MovimientoTorreonFotoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MovimientoTorreonFotoCountAggregateInputType | true
    }

  export interface MovimientoTorreonFotoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MovimientoTorreonFoto'], meta: { name: 'MovimientoTorreonFoto' } }
    /**
     * Find zero or one MovimientoTorreonFoto that matches the filter.
     * @param {MovimientoTorreonFotoFindUniqueArgs} args - Arguments to find a MovimientoTorreonFoto
     * @example
     * // Get one MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MovimientoTorreonFotoFindUniqueArgs>(args: SelectSubset<T, MovimientoTorreonFotoFindUniqueArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MovimientoTorreonFoto that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MovimientoTorreonFotoFindUniqueOrThrowArgs} args - Arguments to find a MovimientoTorreonFoto
     * @example
     * // Get one MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MovimientoTorreonFotoFindUniqueOrThrowArgs>(args: SelectSubset<T, MovimientoTorreonFotoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MovimientoTorreonFoto that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoFindFirstArgs} args - Arguments to find a MovimientoTorreonFoto
     * @example
     * // Get one MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MovimientoTorreonFotoFindFirstArgs>(args?: SelectSubset<T, MovimientoTorreonFotoFindFirstArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MovimientoTorreonFoto that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoFindFirstOrThrowArgs} args - Arguments to find a MovimientoTorreonFoto
     * @example
     * // Get one MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MovimientoTorreonFotoFindFirstOrThrowArgs>(args?: SelectSubset<T, MovimientoTorreonFotoFindFirstOrThrowArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MovimientoTorreonFotos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MovimientoTorreonFotos
     * const movimientoTorreonFotos = await prisma.movimientoTorreonFoto.findMany()
     * 
     * // Get first 10 MovimientoTorreonFotos
     * const movimientoTorreonFotos = await prisma.movimientoTorreonFoto.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const movimientoTorreonFotoWithIdOnly = await prisma.movimientoTorreonFoto.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MovimientoTorreonFotoFindManyArgs>(args?: SelectSubset<T, MovimientoTorreonFotoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MovimientoTorreonFoto.
     * @param {MovimientoTorreonFotoCreateArgs} args - Arguments to create a MovimientoTorreonFoto.
     * @example
     * // Create one MovimientoTorreonFoto
     * const MovimientoTorreonFoto = await prisma.movimientoTorreonFoto.create({
     *   data: {
     *     // ... data to create a MovimientoTorreonFoto
     *   }
     * })
     * 
     */
    create<T extends MovimientoTorreonFotoCreateArgs>(args: SelectSubset<T, MovimientoTorreonFotoCreateArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MovimientoTorreonFotos.
     * @param {MovimientoTorreonFotoCreateManyArgs} args - Arguments to create many MovimientoTorreonFotos.
     * @example
     * // Create many MovimientoTorreonFotos
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MovimientoTorreonFotoCreateManyArgs>(args?: SelectSubset<T, MovimientoTorreonFotoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MovimientoTorreonFotos and returns the data saved in the database.
     * @param {MovimientoTorreonFotoCreateManyAndReturnArgs} args - Arguments to create many MovimientoTorreonFotos.
     * @example
     * // Create many MovimientoTorreonFotos
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MovimientoTorreonFotos and only return the `id`
     * const movimientoTorreonFotoWithIdOnly = await prisma.movimientoTorreonFoto.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MovimientoTorreonFotoCreateManyAndReturnArgs>(args?: SelectSubset<T, MovimientoTorreonFotoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MovimientoTorreonFoto.
     * @param {MovimientoTorreonFotoDeleteArgs} args - Arguments to delete one MovimientoTorreonFoto.
     * @example
     * // Delete one MovimientoTorreonFoto
     * const MovimientoTorreonFoto = await prisma.movimientoTorreonFoto.delete({
     *   where: {
     *     // ... filter to delete one MovimientoTorreonFoto
     *   }
     * })
     * 
     */
    delete<T extends MovimientoTorreonFotoDeleteArgs>(args: SelectSubset<T, MovimientoTorreonFotoDeleteArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MovimientoTorreonFoto.
     * @param {MovimientoTorreonFotoUpdateArgs} args - Arguments to update one MovimientoTorreonFoto.
     * @example
     * // Update one MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MovimientoTorreonFotoUpdateArgs>(args: SelectSubset<T, MovimientoTorreonFotoUpdateArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MovimientoTorreonFotos.
     * @param {MovimientoTorreonFotoDeleteManyArgs} args - Arguments to filter MovimientoTorreonFotos to delete.
     * @example
     * // Delete a few MovimientoTorreonFotos
     * const { count } = await prisma.movimientoTorreonFoto.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MovimientoTorreonFotoDeleteManyArgs>(args?: SelectSubset<T, MovimientoTorreonFotoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MovimientoTorreonFotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MovimientoTorreonFotos
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MovimientoTorreonFotoUpdateManyArgs>(args: SelectSubset<T, MovimientoTorreonFotoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MovimientoTorreonFotos and returns the data updated in the database.
     * @param {MovimientoTorreonFotoUpdateManyAndReturnArgs} args - Arguments to update many MovimientoTorreonFotos.
     * @example
     * // Update many MovimientoTorreonFotos
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MovimientoTorreonFotos and only return the `id`
     * const movimientoTorreonFotoWithIdOnly = await prisma.movimientoTorreonFoto.updateManyAndReturn({
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
    updateManyAndReturn<T extends MovimientoTorreonFotoUpdateManyAndReturnArgs>(args: SelectSubset<T, MovimientoTorreonFotoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MovimientoTorreonFoto.
     * @param {MovimientoTorreonFotoUpsertArgs} args - Arguments to update or create a MovimientoTorreonFoto.
     * @example
     * // Update or create a MovimientoTorreonFoto
     * const movimientoTorreonFoto = await prisma.movimientoTorreonFoto.upsert({
     *   create: {
     *     // ... data to create a MovimientoTorreonFoto
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MovimientoTorreonFoto we want to update
     *   }
     * })
     */
    upsert<T extends MovimientoTorreonFotoUpsertArgs>(args: SelectSubset<T, MovimientoTorreonFotoUpsertArgs<ExtArgs>>): Prisma__MovimientoTorreonFotoClient<$Result.GetResult<Prisma.$MovimientoTorreonFotoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MovimientoTorreonFotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoCountArgs} args - Arguments to filter MovimientoTorreonFotos to count.
     * @example
     * // Count the number of MovimientoTorreonFotos
     * const count = await prisma.movimientoTorreonFoto.count({
     *   where: {
     *     // ... the filter for the MovimientoTorreonFotos we want to count
     *   }
     * })
    **/
    count<T extends MovimientoTorreonFotoCountArgs>(
      args?: Subset<T, MovimientoTorreonFotoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MovimientoTorreonFotoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MovimientoTorreonFoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends MovimientoTorreonFotoAggregateArgs>(args: Subset<T, MovimientoTorreonFotoAggregateArgs>): Prisma.PrismaPromise<GetMovimientoTorreonFotoAggregateType<T>>

    /**
     * Group by MovimientoTorreonFoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MovimientoTorreonFotoGroupByArgs} args - Group by arguments.
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
      T extends MovimientoTorreonFotoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MovimientoTorreonFotoGroupByArgs['orderBy'] }
        : { orderBy?: MovimientoTorreonFotoGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, MovimientoTorreonFotoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMovimientoTorreonFotoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MovimientoTorreonFoto model
   */
  readonly fields: MovimientoTorreonFotoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MovimientoTorreonFoto.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MovimientoTorreonFotoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    movimiento<T extends MovimientoTorreonFerroDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MovimientoTorreonFerroDefaultArgs<ExtArgs>>): Prisma__MovimientoTorreonFerroClient<$Result.GetResult<Prisma.$MovimientoTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
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
   * Fields of the MovimientoTorreonFoto model
   */
  interface MovimientoTorreonFotoFieldRefs {
    readonly id: FieldRef<"MovimientoTorreonFoto", 'Int'>
    readonly movimientoId: FieldRef<"MovimientoTorreonFoto", 'Int'>
    readonly tipo: FieldRef<"MovimientoTorreonFoto", 'TipoFotoMovimientoTorreon'>
    readonly orden: FieldRef<"MovimientoTorreonFoto", 'Int'>
    readonly url: FieldRef<"MovimientoTorreonFoto", 'String'>
    readonly storageKey: FieldRef<"MovimientoTorreonFoto", 'String'>
    readonly tomadaPorId: FieldRef<"MovimientoTorreonFoto", 'Int'>
    readonly comentario: FieldRef<"MovimientoTorreonFoto", 'String'>
    readonly tomadaAt: FieldRef<"MovimientoTorreonFoto", 'DateTime'>
    readonly createdAt: FieldRef<"MovimientoTorreonFoto", 'DateTime'>
    readonly updatedAt: FieldRef<"MovimientoTorreonFoto", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MovimientoTorreonFoto findUnique
   */
  export type MovimientoTorreonFotoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFoto to fetch.
     */
    where: MovimientoTorreonFotoWhereUniqueInput
  }

  /**
   * MovimientoTorreonFoto findUniqueOrThrow
   */
  export type MovimientoTorreonFotoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFoto to fetch.
     */
    where: MovimientoTorreonFotoWhereUniqueInput
  }

  /**
   * MovimientoTorreonFoto findFirst
   */
  export type MovimientoTorreonFotoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFoto to fetch.
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFotos to fetch.
     */
    orderBy?: MovimientoTorreonFotoOrderByWithRelationInput | MovimientoTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MovimientoTorreonFotos.
     */
    cursor?: MovimientoTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MovimientoTorreonFotos.
     */
    distinct?: MovimientoTorreonFotoScalarFieldEnum | MovimientoTorreonFotoScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFoto findFirstOrThrow
   */
  export type MovimientoTorreonFotoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFoto to fetch.
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFotos to fetch.
     */
    orderBy?: MovimientoTorreonFotoOrderByWithRelationInput | MovimientoTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MovimientoTorreonFotos.
     */
    cursor?: MovimientoTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MovimientoTorreonFotos.
     */
    distinct?: MovimientoTorreonFotoScalarFieldEnum | MovimientoTorreonFotoScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFoto findMany
   */
  export type MovimientoTorreonFotoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which MovimientoTorreonFotos to fetch.
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MovimientoTorreonFotos to fetch.
     */
    orderBy?: MovimientoTorreonFotoOrderByWithRelationInput | MovimientoTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MovimientoTorreonFotos.
     */
    cursor?: MovimientoTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MovimientoTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MovimientoTorreonFotos.
     */
    skip?: number
    distinct?: MovimientoTorreonFotoScalarFieldEnum | MovimientoTorreonFotoScalarFieldEnum[]
  }

  /**
   * MovimientoTorreonFoto create
   */
  export type MovimientoTorreonFotoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * The data needed to create a MovimientoTorreonFoto.
     */
    data: XOR<MovimientoTorreonFotoCreateInput, MovimientoTorreonFotoUncheckedCreateInput>
  }

  /**
   * MovimientoTorreonFoto createMany
   */
  export type MovimientoTorreonFotoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MovimientoTorreonFotos.
     */
    data: MovimientoTorreonFotoCreateManyInput | MovimientoTorreonFotoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MovimientoTorreonFoto createManyAndReturn
   */
  export type MovimientoTorreonFotoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * The data used to create many MovimientoTorreonFotos.
     */
    data: MovimientoTorreonFotoCreateManyInput | MovimientoTorreonFotoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MovimientoTorreonFoto update
   */
  export type MovimientoTorreonFotoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * The data needed to update a MovimientoTorreonFoto.
     */
    data: XOR<MovimientoTorreonFotoUpdateInput, MovimientoTorreonFotoUncheckedUpdateInput>
    /**
     * Choose, which MovimientoTorreonFoto to update.
     */
    where: MovimientoTorreonFotoWhereUniqueInput
  }

  /**
   * MovimientoTorreonFoto updateMany
   */
  export type MovimientoTorreonFotoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MovimientoTorreonFotos.
     */
    data: XOR<MovimientoTorreonFotoUpdateManyMutationInput, MovimientoTorreonFotoUncheckedUpdateManyInput>
    /**
     * Filter which MovimientoTorreonFotos to update
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * Limit how many MovimientoTorreonFotos to update.
     */
    limit?: number
  }

  /**
   * MovimientoTorreonFoto updateManyAndReturn
   */
  export type MovimientoTorreonFotoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * The data used to update MovimientoTorreonFotos.
     */
    data: XOR<MovimientoTorreonFotoUpdateManyMutationInput, MovimientoTorreonFotoUncheckedUpdateManyInput>
    /**
     * Filter which MovimientoTorreonFotos to update
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * Limit how many MovimientoTorreonFotos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * MovimientoTorreonFoto upsert
   */
  export type MovimientoTorreonFotoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * The filter to search for the MovimientoTorreonFoto to update in case it exists.
     */
    where: MovimientoTorreonFotoWhereUniqueInput
    /**
     * In case the MovimientoTorreonFoto found by the `where` argument doesn't exist, create a new MovimientoTorreonFoto with this data.
     */
    create: XOR<MovimientoTorreonFotoCreateInput, MovimientoTorreonFotoUncheckedCreateInput>
    /**
     * In case the MovimientoTorreonFoto was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MovimientoTorreonFotoUpdateInput, MovimientoTorreonFotoUncheckedUpdateInput>
  }

  /**
   * MovimientoTorreonFoto delete
   */
  export type MovimientoTorreonFotoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter which MovimientoTorreonFoto to delete.
     */
    where: MovimientoTorreonFotoWhereUniqueInput
  }

  /**
   * MovimientoTorreonFoto deleteMany
   */
  export type MovimientoTorreonFotoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MovimientoTorreonFotos to delete
     */
    where?: MovimientoTorreonFotoWhereInput
    /**
     * Limit how many MovimientoTorreonFotos to delete.
     */
    limit?: number
  }

  /**
   * MovimientoTorreonFoto without action
   */
  export type MovimientoTorreonFotoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MovimientoTorreonFoto
     */
    select?: MovimientoTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MovimientoTorreonFoto
     */
    omit?: MovimientoTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MovimientoTorreonFotoInclude<ExtArgs> | null
  }


  /**
   * Model IncidenteTorreonFoto
   */

  export type AggregateIncidenteTorreonFoto = {
    _count: IncidenteTorreonFotoCountAggregateOutputType | null
    _avg: IncidenteTorreonFotoAvgAggregateOutputType | null
    _sum: IncidenteTorreonFotoSumAggregateOutputType | null
    _min: IncidenteTorreonFotoMinAggregateOutputType | null
    _max: IncidenteTorreonFotoMaxAggregateOutputType | null
  }

  export type IncidenteTorreonFotoAvgAggregateOutputType = {
    id: number | null
    incidenteId: number | null
    orden: number | null
    tomadaPorId: number | null
  }

  export type IncidenteTorreonFotoSumAggregateOutputType = {
    id: number | null
    incidenteId: number | null
    orden: number | null
    tomadaPorId: number | null
  }

  export type IncidenteTorreonFotoMinAggregateOutputType = {
    id: number | null
    incidenteId: number | null
    orden: number | null
    url: string | null
    storageKey: string | null
    tomadaPorId: number | null
    comentario: string | null
    tomadaAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type IncidenteTorreonFotoMaxAggregateOutputType = {
    id: number | null
    incidenteId: number | null
    orden: number | null
    url: string | null
    storageKey: string | null
    tomadaPorId: number | null
    comentario: string | null
    tomadaAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type IncidenteTorreonFotoCountAggregateOutputType = {
    id: number
    incidenteId: number
    orden: number
    url: number
    storageKey: number
    tomadaPorId: number
    comentario: number
    tomadaAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type IncidenteTorreonFotoAvgAggregateInputType = {
    id?: true
    incidenteId?: true
    orden?: true
    tomadaPorId?: true
  }

  export type IncidenteTorreonFotoSumAggregateInputType = {
    id?: true
    incidenteId?: true
    orden?: true
    tomadaPorId?: true
  }

  export type IncidenteTorreonFotoMinAggregateInputType = {
    id?: true
    incidenteId?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type IncidenteTorreonFotoMaxAggregateInputType = {
    id?: true
    incidenteId?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type IncidenteTorreonFotoCountAggregateInputType = {
    id?: true
    incidenteId?: true
    orden?: true
    url?: true
    storageKey?: true
    tomadaPorId?: true
    comentario?: true
    tomadaAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type IncidenteTorreonFotoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTorreonFoto to aggregate.
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFotos to fetch.
     */
    orderBy?: IncidenteTorreonFotoOrderByWithRelationInput | IncidenteTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IncidenteTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IncidenteTorreonFotos
    **/
    _count?: true | IncidenteTorreonFotoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: IncidenteTorreonFotoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: IncidenteTorreonFotoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IncidenteTorreonFotoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IncidenteTorreonFotoMaxAggregateInputType
  }

  export type GetIncidenteTorreonFotoAggregateType<T extends IncidenteTorreonFotoAggregateArgs> = {
        [P in keyof T & keyof AggregateIncidenteTorreonFoto]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIncidenteTorreonFoto[P]>
      : GetScalarType<T[P], AggregateIncidenteTorreonFoto[P]>
  }




  export type IncidenteTorreonFotoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IncidenteTorreonFotoWhereInput
    orderBy?: IncidenteTorreonFotoOrderByWithAggregationInput | IncidenteTorreonFotoOrderByWithAggregationInput[]
    by: IncidenteTorreonFotoScalarFieldEnum[] | IncidenteTorreonFotoScalarFieldEnum
    having?: IncidenteTorreonFotoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IncidenteTorreonFotoCountAggregateInputType | true
    _avg?: IncidenteTorreonFotoAvgAggregateInputType
    _sum?: IncidenteTorreonFotoSumAggregateInputType
    _min?: IncidenteTorreonFotoMinAggregateInputType
    _max?: IncidenteTorreonFotoMaxAggregateInputType
  }

  export type IncidenteTorreonFotoGroupByOutputType = {
    id: number
    incidenteId: number
    orden: number
    url: string
    storageKey: string | null
    tomadaPorId: number
    comentario: string | null
    tomadaAt: Date
    createdAt: Date
    updatedAt: Date
    _count: IncidenteTorreonFotoCountAggregateOutputType | null
    _avg: IncidenteTorreonFotoAvgAggregateOutputType | null
    _sum: IncidenteTorreonFotoSumAggregateOutputType | null
    _min: IncidenteTorreonFotoMinAggregateOutputType | null
    _max: IncidenteTorreonFotoMaxAggregateOutputType | null
  }

  type GetIncidenteTorreonFotoGroupByPayload<T extends IncidenteTorreonFotoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IncidenteTorreonFotoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IncidenteTorreonFotoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IncidenteTorreonFotoGroupByOutputType[P]>
            : GetScalarType<T[P], IncidenteTorreonFotoGroupByOutputType[P]>
        }
      >
    >


  export type IncidenteTorreonFotoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteId?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFoto"]>

  export type IncidenteTorreonFotoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteId?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFoto"]>

  export type IncidenteTorreonFotoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    incidenteId?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["incidenteTorreonFoto"]>

  export type IncidenteTorreonFotoSelectScalar = {
    id?: boolean
    incidenteId?: boolean
    orden?: boolean
    url?: boolean
    storageKey?: boolean
    tomadaPorId?: boolean
    comentario?: boolean
    tomadaAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type IncidenteTorreonFotoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "incidenteId" | "orden" | "url" | "storageKey" | "tomadaPorId" | "comentario" | "tomadaAt" | "createdAt" | "updatedAt", ExtArgs["result"]["incidenteTorreonFoto"]>
  export type IncidenteTorreonFotoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }
  export type IncidenteTorreonFotoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }
  export type IncidenteTorreonFotoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    incidente?: boolean | IncidenteTorreonFerroDefaultArgs<ExtArgs>
  }

  export type $IncidenteTorreonFotoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IncidenteTorreonFoto"
    objects: {
      incidente: Prisma.$IncidenteTorreonFerroPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      incidenteId: number
      orden: number
      url: string
      storageKey: string | null
      tomadaPorId: number
      comentario: string | null
      tomadaAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["incidenteTorreonFoto"]>
    composites: {}
  }

  type IncidenteTorreonFotoGetPayload<S extends boolean | null | undefined | IncidenteTorreonFotoDefaultArgs> = $Result.GetResult<Prisma.$IncidenteTorreonFotoPayload, S>

  type IncidenteTorreonFotoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IncidenteTorreonFotoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IncidenteTorreonFotoCountAggregateInputType | true
    }

  export interface IncidenteTorreonFotoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IncidenteTorreonFoto'], meta: { name: 'IncidenteTorreonFoto' } }
    /**
     * Find zero or one IncidenteTorreonFoto that matches the filter.
     * @param {IncidenteTorreonFotoFindUniqueArgs} args - Arguments to find a IncidenteTorreonFoto
     * @example
     * // Get one IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IncidenteTorreonFotoFindUniqueArgs>(args: SelectSubset<T, IncidenteTorreonFotoFindUniqueArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IncidenteTorreonFoto that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IncidenteTorreonFotoFindUniqueOrThrowArgs} args - Arguments to find a IncidenteTorreonFoto
     * @example
     * // Get one IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IncidenteTorreonFotoFindUniqueOrThrowArgs>(args: SelectSubset<T, IncidenteTorreonFotoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorreonFoto that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoFindFirstArgs} args - Arguments to find a IncidenteTorreonFoto
     * @example
     * // Get one IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IncidenteTorreonFotoFindFirstArgs>(args?: SelectSubset<T, IncidenteTorreonFotoFindFirstArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IncidenteTorreonFoto that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoFindFirstOrThrowArgs} args - Arguments to find a IncidenteTorreonFoto
     * @example
     * // Get one IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IncidenteTorreonFotoFindFirstOrThrowArgs>(args?: SelectSubset<T, IncidenteTorreonFotoFindFirstOrThrowArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IncidenteTorreonFotos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IncidenteTorreonFotos
     * const incidenteTorreonFotos = await prisma.incidenteTorreonFoto.findMany()
     * 
     * // Get first 10 IncidenteTorreonFotos
     * const incidenteTorreonFotos = await prisma.incidenteTorreonFoto.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const incidenteTorreonFotoWithIdOnly = await prisma.incidenteTorreonFoto.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IncidenteTorreonFotoFindManyArgs>(args?: SelectSubset<T, IncidenteTorreonFotoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IncidenteTorreonFoto.
     * @param {IncidenteTorreonFotoCreateArgs} args - Arguments to create a IncidenteTorreonFoto.
     * @example
     * // Create one IncidenteTorreonFoto
     * const IncidenteTorreonFoto = await prisma.incidenteTorreonFoto.create({
     *   data: {
     *     // ... data to create a IncidenteTorreonFoto
     *   }
     * })
     * 
     */
    create<T extends IncidenteTorreonFotoCreateArgs>(args: SelectSubset<T, IncidenteTorreonFotoCreateArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IncidenteTorreonFotos.
     * @param {IncidenteTorreonFotoCreateManyArgs} args - Arguments to create many IncidenteTorreonFotos.
     * @example
     * // Create many IncidenteTorreonFotos
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IncidenteTorreonFotoCreateManyArgs>(args?: SelectSubset<T, IncidenteTorreonFotoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many IncidenteTorreonFotos and returns the data saved in the database.
     * @param {IncidenteTorreonFotoCreateManyAndReturnArgs} args - Arguments to create many IncidenteTorreonFotos.
     * @example
     * // Create many IncidenteTorreonFotos
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many IncidenteTorreonFotos and only return the `id`
     * const incidenteTorreonFotoWithIdOnly = await prisma.incidenteTorreonFoto.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends IncidenteTorreonFotoCreateManyAndReturnArgs>(args?: SelectSubset<T, IncidenteTorreonFotoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a IncidenteTorreonFoto.
     * @param {IncidenteTorreonFotoDeleteArgs} args - Arguments to delete one IncidenteTorreonFoto.
     * @example
     * // Delete one IncidenteTorreonFoto
     * const IncidenteTorreonFoto = await prisma.incidenteTorreonFoto.delete({
     *   where: {
     *     // ... filter to delete one IncidenteTorreonFoto
     *   }
     * })
     * 
     */
    delete<T extends IncidenteTorreonFotoDeleteArgs>(args: SelectSubset<T, IncidenteTorreonFotoDeleteArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IncidenteTorreonFoto.
     * @param {IncidenteTorreonFotoUpdateArgs} args - Arguments to update one IncidenteTorreonFoto.
     * @example
     * // Update one IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IncidenteTorreonFotoUpdateArgs>(args: SelectSubset<T, IncidenteTorreonFotoUpdateArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IncidenteTorreonFotos.
     * @param {IncidenteTorreonFotoDeleteManyArgs} args - Arguments to filter IncidenteTorreonFotos to delete.
     * @example
     * // Delete a few IncidenteTorreonFotos
     * const { count } = await prisma.incidenteTorreonFoto.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IncidenteTorreonFotoDeleteManyArgs>(args?: SelectSubset<T, IncidenteTorreonFotoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTorreonFotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IncidenteTorreonFotos
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IncidenteTorreonFotoUpdateManyArgs>(args: SelectSubset<T, IncidenteTorreonFotoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IncidenteTorreonFotos and returns the data updated in the database.
     * @param {IncidenteTorreonFotoUpdateManyAndReturnArgs} args - Arguments to update many IncidenteTorreonFotos.
     * @example
     * // Update many IncidenteTorreonFotos
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more IncidenteTorreonFotos and only return the `id`
     * const incidenteTorreonFotoWithIdOnly = await prisma.incidenteTorreonFoto.updateManyAndReturn({
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
    updateManyAndReturn<T extends IncidenteTorreonFotoUpdateManyAndReturnArgs>(args: SelectSubset<T, IncidenteTorreonFotoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one IncidenteTorreonFoto.
     * @param {IncidenteTorreonFotoUpsertArgs} args - Arguments to update or create a IncidenteTorreonFoto.
     * @example
     * // Update or create a IncidenteTorreonFoto
     * const incidenteTorreonFoto = await prisma.incidenteTorreonFoto.upsert({
     *   create: {
     *     // ... data to create a IncidenteTorreonFoto
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IncidenteTorreonFoto we want to update
     *   }
     * })
     */
    upsert<T extends IncidenteTorreonFotoUpsertArgs>(args: SelectSubset<T, IncidenteTorreonFotoUpsertArgs<ExtArgs>>): Prisma__IncidenteTorreonFotoClient<$Result.GetResult<Prisma.$IncidenteTorreonFotoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of IncidenteTorreonFotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoCountArgs} args - Arguments to filter IncidenteTorreonFotos to count.
     * @example
     * // Count the number of IncidenteTorreonFotos
     * const count = await prisma.incidenteTorreonFoto.count({
     *   where: {
     *     // ... the filter for the IncidenteTorreonFotos we want to count
     *   }
     * })
    **/
    count<T extends IncidenteTorreonFotoCountArgs>(
      args?: Subset<T, IncidenteTorreonFotoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IncidenteTorreonFotoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IncidenteTorreonFoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends IncidenteTorreonFotoAggregateArgs>(args: Subset<T, IncidenteTorreonFotoAggregateArgs>): Prisma.PrismaPromise<GetIncidenteTorreonFotoAggregateType<T>>

    /**
     * Group by IncidenteTorreonFoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IncidenteTorreonFotoGroupByArgs} args - Group by arguments.
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
      T extends IncidenteTorreonFotoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IncidenteTorreonFotoGroupByArgs['orderBy'] }
        : { orderBy?: IncidenteTorreonFotoGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, IncidenteTorreonFotoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIncidenteTorreonFotoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IncidenteTorreonFoto model
   */
  readonly fields: IncidenteTorreonFotoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IncidenteTorreonFoto.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IncidenteTorreonFotoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    incidente<T extends IncidenteTorreonFerroDefaultArgs<ExtArgs> = {}>(args?: Subset<T, IncidenteTorreonFerroDefaultArgs<ExtArgs>>): Prisma__IncidenteTorreonFerroClient<$Result.GetResult<Prisma.$IncidenteTorreonFerroPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
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
   * Fields of the IncidenteTorreonFoto model
   */
  interface IncidenteTorreonFotoFieldRefs {
    readonly id: FieldRef<"IncidenteTorreonFoto", 'Int'>
    readonly incidenteId: FieldRef<"IncidenteTorreonFoto", 'Int'>
    readonly orden: FieldRef<"IncidenteTorreonFoto", 'Int'>
    readonly url: FieldRef<"IncidenteTorreonFoto", 'String'>
    readonly storageKey: FieldRef<"IncidenteTorreonFoto", 'String'>
    readonly tomadaPorId: FieldRef<"IncidenteTorreonFoto", 'Int'>
    readonly comentario: FieldRef<"IncidenteTorreonFoto", 'String'>
    readonly tomadaAt: FieldRef<"IncidenteTorreonFoto", 'DateTime'>
    readonly createdAt: FieldRef<"IncidenteTorreonFoto", 'DateTime'>
    readonly updatedAt: FieldRef<"IncidenteTorreonFoto", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * IncidenteTorreonFoto findUnique
   */
  export type IncidenteTorreonFotoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFoto to fetch.
     */
    where: IncidenteTorreonFotoWhereUniqueInput
  }

  /**
   * IncidenteTorreonFoto findUniqueOrThrow
   */
  export type IncidenteTorreonFotoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFoto to fetch.
     */
    where: IncidenteTorreonFotoWhereUniqueInput
  }

  /**
   * IncidenteTorreonFoto findFirst
   */
  export type IncidenteTorreonFotoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFoto to fetch.
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFotos to fetch.
     */
    orderBy?: IncidenteTorreonFotoOrderByWithRelationInput | IncidenteTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTorreonFotos.
     */
    cursor?: IncidenteTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTorreonFotos.
     */
    distinct?: IncidenteTorreonFotoScalarFieldEnum | IncidenteTorreonFotoScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFoto findFirstOrThrow
   */
  export type IncidenteTorreonFotoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFoto to fetch.
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFotos to fetch.
     */
    orderBy?: IncidenteTorreonFotoOrderByWithRelationInput | IncidenteTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IncidenteTorreonFotos.
     */
    cursor?: IncidenteTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IncidenteTorreonFotos.
     */
    distinct?: IncidenteTorreonFotoScalarFieldEnum | IncidenteTorreonFotoScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFoto findMany
   */
  export type IncidenteTorreonFotoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter, which IncidenteTorreonFotos to fetch.
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IncidenteTorreonFotos to fetch.
     */
    orderBy?: IncidenteTorreonFotoOrderByWithRelationInput | IncidenteTorreonFotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IncidenteTorreonFotos.
     */
    cursor?: IncidenteTorreonFotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IncidenteTorreonFotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IncidenteTorreonFotos.
     */
    skip?: number
    distinct?: IncidenteTorreonFotoScalarFieldEnum | IncidenteTorreonFotoScalarFieldEnum[]
  }

  /**
   * IncidenteTorreonFoto create
   */
  export type IncidenteTorreonFotoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * The data needed to create a IncidenteTorreonFoto.
     */
    data: XOR<IncidenteTorreonFotoCreateInput, IncidenteTorreonFotoUncheckedCreateInput>
  }

  /**
   * IncidenteTorreonFoto createMany
   */
  export type IncidenteTorreonFotoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IncidenteTorreonFotos.
     */
    data: IncidenteTorreonFotoCreateManyInput | IncidenteTorreonFotoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * IncidenteTorreonFoto createManyAndReturn
   */
  export type IncidenteTorreonFotoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * The data used to create many IncidenteTorreonFotos.
     */
    data: IncidenteTorreonFotoCreateManyInput | IncidenteTorreonFotoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorreonFoto update
   */
  export type IncidenteTorreonFotoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * The data needed to update a IncidenteTorreonFoto.
     */
    data: XOR<IncidenteTorreonFotoUpdateInput, IncidenteTorreonFotoUncheckedUpdateInput>
    /**
     * Choose, which IncidenteTorreonFoto to update.
     */
    where: IncidenteTorreonFotoWhereUniqueInput
  }

  /**
   * IncidenteTorreonFoto updateMany
   */
  export type IncidenteTorreonFotoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IncidenteTorreonFotos.
     */
    data: XOR<IncidenteTorreonFotoUpdateManyMutationInput, IncidenteTorreonFotoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTorreonFotos to update
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * Limit how many IncidenteTorreonFotos to update.
     */
    limit?: number
  }

  /**
   * IncidenteTorreonFoto updateManyAndReturn
   */
  export type IncidenteTorreonFotoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * The data used to update IncidenteTorreonFotos.
     */
    data: XOR<IncidenteTorreonFotoUpdateManyMutationInput, IncidenteTorreonFotoUncheckedUpdateManyInput>
    /**
     * Filter which IncidenteTorreonFotos to update
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * Limit how many IncidenteTorreonFotos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * IncidenteTorreonFoto upsert
   */
  export type IncidenteTorreonFotoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * The filter to search for the IncidenteTorreonFoto to update in case it exists.
     */
    where: IncidenteTorreonFotoWhereUniqueInput
    /**
     * In case the IncidenteTorreonFoto found by the `where` argument doesn't exist, create a new IncidenteTorreonFoto with this data.
     */
    create: XOR<IncidenteTorreonFotoCreateInput, IncidenteTorreonFotoUncheckedCreateInput>
    /**
     * In case the IncidenteTorreonFoto was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IncidenteTorreonFotoUpdateInput, IncidenteTorreonFotoUncheckedUpdateInput>
  }

  /**
   * IncidenteTorreonFoto delete
   */
  export type IncidenteTorreonFotoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
    /**
     * Filter which IncidenteTorreonFoto to delete.
     */
    where: IncidenteTorreonFotoWhereUniqueInput
  }

  /**
   * IncidenteTorreonFoto deleteMany
   */
  export type IncidenteTorreonFotoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IncidenteTorreonFotos to delete
     */
    where?: IncidenteTorreonFotoWhereInput
    /**
     * Limit how many IncidenteTorreonFotos to delete.
     */
    limit?: number
  }

  /**
   * IncidenteTorreonFoto without action
   */
  export type IncidenteTorreonFotoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IncidenteTorreonFoto
     */
    select?: IncidenteTorreonFotoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IncidenteTorreonFoto
     */
    omit?: IncidenteTorreonFotoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: IncidenteTorreonFotoInclude<ExtArgs> | null
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


  export const MovimientoTorreonFerroScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    creadoPorId: 'creadoPorId',
    clienteId: 'clienteId',
    supervisorId: 'supervisorId',
    coordinadorId: 'coordinadorId',
    operadorId: 'operadorId',
    localidadId: 'localidadId',
    viaOrigenId: 'viaOrigenId',
    viaDestinoId: 'viaDestinoId',
    seccionOrigenId: 'seccionOrigenId',
    seccionDestinoId: 'seccionDestinoId',
    locomotiveNumber: 'locomotiveNumber',
    prioridad: 'prioridad',
    tipoMovimiento: 'tipoMovimiento',
    estado: 'estado',
    fechaSolicitud: 'fechaSolicitud',
    fechaInicio: 'fechaInicio',
    fechaFin: 'fechaFin',
    fechaPausa: 'fechaPausa',
    instrucciones: 'instrucciones',
    posicionChimenea: 'posicionChimenea',
    finalizado: 'finalizado',
    direccionEmpuje: 'direccionEmpuje',
    posicionCabina: 'posicionCabina',
    empresaNombreSnapshot: 'empresaNombreSnapshot',
    localidadNombreSnapshot: 'localidadNombreSnapshot',
    viaOrigenNombreSnapshot: 'viaOrigenNombreSnapshot',
    viaDestinoNombreSnapshot: 'viaDestinoNombreSnapshot',
    seccionOrigenNombreSnapshot: 'seccionOrigenNombreSnapshot',
    seccionDestinoNombreSnapshot: 'seccionDestinoNombreSnapshot',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MovimientoTorreonFerroScalarFieldEnum = (typeof MovimientoTorreonFerroScalarFieldEnum)[keyof typeof MovimientoTorreonFerroScalarFieldEnum]


  export const RondaTorreonScalarFieldEnum: {
    id: 'id',
    localidadId: 'localidadId',
    numeroRonda: 'numeroRonda',
    estado: 'estado',
    fechaApertura: 'fechaApertura',
    fechaCierre: 'fechaCierre',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RondaTorreonScalarFieldEnum = (typeof RondaTorreonScalarFieldEnum)[keyof typeof RondaTorreonScalarFieldEnum]


  export const RondaTorreonMovimientoScalarFieldEnum: {
    id: 'id',
    rondaId: 'rondaId',
    movimientoId: 'movimientoId',
    bloqueadoPorIncidenteId: 'bloqueadoPorIncidenteId',
    empresaId: 'empresaId',
    orden: 'orden',
    prioridad: 'prioridad',
    estado: 'estado',
    fechaAsignado: 'fechaAsignado',
    fechaInicio: 'fechaInicio',
    fechaFin: 'fechaFin',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RondaTorreonMovimientoScalarFieldEnum = (typeof RondaTorreonMovimientoScalarFieldEnum)[keyof typeof RondaTorreonMovimientoScalarFieldEnum]


  export const IncidenteTorreonFerroScalarFieldEnum: {
    id: 'id',
    movimientoId: 'movimientoId',
    creadoPorId: 'creadoPorId',
    resueltoPorId: 'resueltoPorId',
    estado: 'estado',
    motivo: 'motivo',
    solucion: 'solucion',
    localidadId: 'localidadId',
    viaBloqueadaId: 'viaBloqueadaId',
    seccionBloqueadaId: 'seccionBloqueadaId',
    fechaInicio: 'fechaInicio',
    fechaResolucion: 'fechaResolucion',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type IncidenteTorreonFerroScalarFieldEnum = (typeof IncidenteTorreonFerroScalarFieldEnum)[keyof typeof IncidenteTorreonFerroScalarFieldEnum]


  export const MovimientoTorreonFotoScalarFieldEnum: {
    id: 'id',
    movimientoId: 'movimientoId',
    tipo: 'tipo',
    orden: 'orden',
    url: 'url',
    storageKey: 'storageKey',
    tomadaPorId: 'tomadaPorId',
    comentario: 'comentario',
    tomadaAt: 'tomadaAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MovimientoTorreonFotoScalarFieldEnum = (typeof MovimientoTorreonFotoScalarFieldEnum)[keyof typeof MovimientoTorreonFotoScalarFieldEnum]


  export const IncidenteTorreonFotoScalarFieldEnum: {
    id: 'id',
    incidenteId: 'incidenteId',
    orden: 'orden',
    url: 'url',
    storageKey: 'storageKey',
    tomadaPorId: 'tomadaPorId',
    comentario: 'comentario',
    tomadaAt: 'tomadaAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type IncidenteTorreonFotoScalarFieldEnum = (typeof IncidenteTorreonFotoScalarFieldEnum)[keyof typeof IncidenteTorreonFotoScalarFieldEnum]


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
   * Reference to a field of type 'PrioridadTorreon'
   */
  export type EnumPrioridadTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PrioridadTorreon'>
    


  /**
   * Reference to a field of type 'PrioridadTorreon[]'
   */
  export type ListEnumPrioridadTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PrioridadTorreon[]'>
    


  /**
   * Reference to a field of type 'TipoMovimientoTorreon'
   */
  export type EnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoMovimientoTorreon'>
    


  /**
   * Reference to a field of type 'TipoMovimientoTorreon[]'
   */
  export type ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoMovimientoTorreon[]'>
    


  /**
   * Reference to a field of type 'EstadoMovimientoTorreon'
   */
  export type EnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoMovimientoTorreon'>
    


  /**
   * Reference to a field of type 'EstadoMovimientoTorreon[]'
   */
  export type ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoMovimientoTorreon[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'PosicionChimeneaTorreon'
   */
  export type EnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PosicionChimeneaTorreon'>
    


  /**
   * Reference to a field of type 'PosicionChimeneaTorreon[]'
   */
  export type ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PosicionChimeneaTorreon[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DireccionEmpujeTorreon'
   */
  export type EnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DireccionEmpujeTorreon'>
    


  /**
   * Reference to a field of type 'DireccionEmpujeTorreon[]'
   */
  export type ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DireccionEmpujeTorreon[]'>
    


  /**
   * Reference to a field of type 'PosicionCabinaTorreon'
   */
  export type EnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PosicionCabinaTorreon'>
    


  /**
   * Reference to a field of type 'PosicionCabinaTorreon[]'
   */
  export type ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PosicionCabinaTorreon[]'>
    


  /**
   * Reference to a field of type 'EstadoRondaTorreon'
   */
  export type EnumEstadoRondaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaTorreon'>
    


  /**
   * Reference to a field of type 'EstadoRondaTorreon[]'
   */
  export type ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaTorreon[]'>
    


  /**
   * Reference to a field of type 'EstadoRondaMovimientoTorreon'
   */
  export type EnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaMovimientoTorreon'>
    


  /**
   * Reference to a field of type 'EstadoRondaMovimientoTorreon[]'
   */
  export type ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoRondaMovimientoTorreon[]'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTorreon'
   */
  export type EnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTorreon'>
    


  /**
   * Reference to a field of type 'EstadoIncidenteTorreon[]'
   */
  export type ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoIncidenteTorreon[]'>
    


  /**
   * Reference to a field of type 'TipoFotoMovimientoTorreon'
   */
  export type EnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoFotoMovimientoTorreon'>
    


  /**
   * Reference to a field of type 'TipoFotoMovimientoTorreon[]'
   */
  export type ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoFotoMovimientoTorreon[]'>
    


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


  export type MovimientoTorreonFerroWhereInput = {
    AND?: MovimientoTorreonFerroWhereInput | MovimientoTorreonFerroWhereInput[]
    OR?: MovimientoTorreonFerroWhereInput[]
    NOT?: MovimientoTorreonFerroWhereInput | MovimientoTorreonFerroWhereInput[]
    id?: IntFilter<"MovimientoTorreonFerro"> | number
    empresaId?: IntFilter<"MovimientoTorreonFerro"> | number
    creadoPorId?: IntFilter<"MovimientoTorreonFerro"> | number
    clienteId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    supervisorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    coordinadorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    operadorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    localidadId?: IntFilter<"MovimientoTorreonFerro"> | number
    viaOrigenId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    viaDestinoId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    seccionOrigenId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    seccionDestinoId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    locomotiveNumber?: IntFilter<"MovimientoTorreonFerro"> | number
    prioridad?: EnumPrioridadTorreonFilter<"MovimientoTorreonFerro"> | $Enums.PrioridadTorreon
    tipoMovimiento?: EnumTipoMovimientoTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFilter<"MovimientoTorreonFerro"> | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    fechaInicio?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaPausa?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    instrucciones?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    posicionChimenea?: EnumPosicionChimeneaTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFilter<"MovimientoTorreonFerro"> | boolean
    direccionEmpuje?: EnumDireccionEmpujeTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: EnumPosicionCabinaTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    localidadNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    viaOrigenNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    viaDestinoNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    seccionOrigenNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    seccionDestinoNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    createdAt?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    updatedAt?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    rondas?: RondaTorreonMovimientoListRelationFilter
    incidentes?: IncidenteTorreonFerroListRelationFilter
    fotos?: MovimientoTorreonFotoListRelationFilter
  }

  export type MovimientoTorreonFerroOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrderInput | SortOrder
    supervisorId?: SortOrderInput | SortOrder
    coordinadorId?: SortOrderInput | SortOrder
    operadorId?: SortOrderInput | SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrderInput | SortOrder
    viaDestinoId?: SortOrderInput | SortOrder
    seccionOrigenId?: SortOrderInput | SortOrder
    seccionDestinoId?: SortOrderInput | SortOrder
    locomotiveNumber?: SortOrder
    prioridad?: SortOrder
    tipoMovimiento?: SortOrderInput | SortOrder
    estado?: SortOrder
    fechaSolicitud?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    fechaPausa?: SortOrderInput | SortOrder
    instrucciones?: SortOrderInput | SortOrder
    posicionChimenea?: SortOrderInput | SortOrder
    finalizado?: SortOrder
    direccionEmpuje?: SortOrderInput | SortOrder
    posicionCabina?: SortOrderInput | SortOrder
    empresaNombreSnapshot?: SortOrderInput | SortOrder
    localidadNombreSnapshot?: SortOrderInput | SortOrder
    viaOrigenNombreSnapshot?: SortOrderInput | SortOrder
    viaDestinoNombreSnapshot?: SortOrderInput | SortOrder
    seccionOrigenNombreSnapshot?: SortOrderInput | SortOrder
    seccionDestinoNombreSnapshot?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    rondas?: RondaTorreonMovimientoOrderByRelationAggregateInput
    incidentes?: IncidenteTorreonFerroOrderByRelationAggregateInput
    fotos?: MovimientoTorreonFotoOrderByRelationAggregateInput
  }

  export type MovimientoTorreonFerroWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: MovimientoTorreonFerroWhereInput | MovimientoTorreonFerroWhereInput[]
    OR?: MovimientoTorreonFerroWhereInput[]
    NOT?: MovimientoTorreonFerroWhereInput | MovimientoTorreonFerroWhereInput[]
    empresaId?: IntFilter<"MovimientoTorreonFerro"> | number
    creadoPorId?: IntFilter<"MovimientoTorreonFerro"> | number
    clienteId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    supervisorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    coordinadorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    operadorId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    localidadId?: IntFilter<"MovimientoTorreonFerro"> | number
    viaOrigenId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    viaDestinoId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    seccionOrigenId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    seccionDestinoId?: IntNullableFilter<"MovimientoTorreonFerro"> | number | null
    locomotiveNumber?: IntFilter<"MovimientoTorreonFerro"> | number
    prioridad?: EnumPrioridadTorreonFilter<"MovimientoTorreonFerro"> | $Enums.PrioridadTorreon
    tipoMovimiento?: EnumTipoMovimientoTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFilter<"MovimientoTorreonFerro"> | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    fechaInicio?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaPausa?: DateTimeNullableFilter<"MovimientoTorreonFerro"> | Date | string | null
    instrucciones?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    posicionChimenea?: EnumPosicionChimeneaTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFilter<"MovimientoTorreonFerro"> | boolean
    direccionEmpuje?: EnumDireccionEmpujeTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: EnumPosicionCabinaTorreonNullableFilter<"MovimientoTorreonFerro"> | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    localidadNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    viaOrigenNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    viaDestinoNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    seccionOrigenNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    seccionDestinoNombreSnapshot?: StringNullableFilter<"MovimientoTorreonFerro"> | string | null
    createdAt?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    updatedAt?: DateTimeFilter<"MovimientoTorreonFerro"> | Date | string
    rondas?: RondaTorreonMovimientoListRelationFilter
    incidentes?: IncidenteTorreonFerroListRelationFilter
    fotos?: MovimientoTorreonFotoListRelationFilter
  }, "id">

  export type MovimientoTorreonFerroOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrderInput | SortOrder
    supervisorId?: SortOrderInput | SortOrder
    coordinadorId?: SortOrderInput | SortOrder
    operadorId?: SortOrderInput | SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrderInput | SortOrder
    viaDestinoId?: SortOrderInput | SortOrder
    seccionOrigenId?: SortOrderInput | SortOrder
    seccionDestinoId?: SortOrderInput | SortOrder
    locomotiveNumber?: SortOrder
    prioridad?: SortOrder
    tipoMovimiento?: SortOrderInput | SortOrder
    estado?: SortOrder
    fechaSolicitud?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    fechaPausa?: SortOrderInput | SortOrder
    instrucciones?: SortOrderInput | SortOrder
    posicionChimenea?: SortOrderInput | SortOrder
    finalizado?: SortOrder
    direccionEmpuje?: SortOrderInput | SortOrder
    posicionCabina?: SortOrderInput | SortOrder
    empresaNombreSnapshot?: SortOrderInput | SortOrder
    localidadNombreSnapshot?: SortOrderInput | SortOrder
    viaOrigenNombreSnapshot?: SortOrderInput | SortOrder
    viaDestinoNombreSnapshot?: SortOrderInput | SortOrder
    seccionOrigenNombreSnapshot?: SortOrderInput | SortOrder
    seccionDestinoNombreSnapshot?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MovimientoTorreonFerroCountOrderByAggregateInput
    _avg?: MovimientoTorreonFerroAvgOrderByAggregateInput
    _max?: MovimientoTorreonFerroMaxOrderByAggregateInput
    _min?: MovimientoTorreonFerroMinOrderByAggregateInput
    _sum?: MovimientoTorreonFerroSumOrderByAggregateInput
  }

  export type MovimientoTorreonFerroScalarWhereWithAggregatesInput = {
    AND?: MovimientoTorreonFerroScalarWhereWithAggregatesInput | MovimientoTorreonFerroScalarWhereWithAggregatesInput[]
    OR?: MovimientoTorreonFerroScalarWhereWithAggregatesInput[]
    NOT?: MovimientoTorreonFerroScalarWhereWithAggregatesInput | MovimientoTorreonFerroScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"MovimientoTorreonFerro"> | number
    empresaId?: IntWithAggregatesFilter<"MovimientoTorreonFerro"> | number
    creadoPorId?: IntWithAggregatesFilter<"MovimientoTorreonFerro"> | number
    clienteId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    supervisorId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    coordinadorId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    operadorId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    localidadId?: IntWithAggregatesFilter<"MovimientoTorreonFerro"> | number
    viaOrigenId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    viaDestinoId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    seccionOrigenId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    seccionDestinoId?: IntNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | number | null
    locomotiveNumber?: IntWithAggregatesFilter<"MovimientoTorreonFerro"> | number
    prioridad?: EnumPrioridadTorreonWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.PrioridadTorreon
    tipoMovimiento?: EnumTipoMovimientoTorreonNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string
    fechaInicio?: DateTimeNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaFin?: DateTimeNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string | null
    fechaPausa?: DateTimeNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string | null
    instrucciones?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    posicionChimenea?: EnumPosicionChimeneaTorreonNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolWithAggregatesFilter<"MovimientoTorreonFerro"> | boolean
    direccionEmpuje?: EnumDireccionEmpujeTorreonNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: EnumPosicionCabinaTorreonNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    localidadNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    viaOrigenNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    viaDestinoNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    seccionOrigenNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    seccionDestinoNombreSnapshot?: StringNullableWithAggregatesFilter<"MovimientoTorreonFerro"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MovimientoTorreonFerro"> | Date | string
  }

  export type RondaTorreonWhereInput = {
    AND?: RondaTorreonWhereInput | RondaTorreonWhereInput[]
    OR?: RondaTorreonWhereInput[]
    NOT?: RondaTorreonWhereInput | RondaTorreonWhereInput[]
    id?: IntFilter<"RondaTorreon"> | number
    localidadId?: IntFilter<"RondaTorreon"> | number
    numeroRonda?: IntFilter<"RondaTorreon"> | number
    estado?: EnumEstadoRondaTorreonFilter<"RondaTorreon"> | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFilter<"RondaTorreon"> | Date | string
    fechaCierre?: DateTimeNullableFilter<"RondaTorreon"> | Date | string | null
    createdAt?: DateTimeFilter<"RondaTorreon"> | Date | string
    updatedAt?: DateTimeFilter<"RondaTorreon"> | Date | string
    movimientos?: RondaTorreonMovimientoListRelationFilter
  }

  export type RondaTorreonOrderByWithRelationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
    estado?: SortOrder
    fechaApertura?: SortOrder
    fechaCierre?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    movimientos?: RondaTorreonMovimientoOrderByRelationAggregateInput
  }

  export type RondaTorreonWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: RondaTorreonWhereInput | RondaTorreonWhereInput[]
    OR?: RondaTorreonWhereInput[]
    NOT?: RondaTorreonWhereInput | RondaTorreonWhereInput[]
    localidadId?: IntFilter<"RondaTorreon"> | number
    numeroRonda?: IntFilter<"RondaTorreon"> | number
    estado?: EnumEstadoRondaTorreonFilter<"RondaTorreon"> | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFilter<"RondaTorreon"> | Date | string
    fechaCierre?: DateTimeNullableFilter<"RondaTorreon"> | Date | string | null
    createdAt?: DateTimeFilter<"RondaTorreon"> | Date | string
    updatedAt?: DateTimeFilter<"RondaTorreon"> | Date | string
    movimientos?: RondaTorreonMovimientoListRelationFilter
  }, "id">

  export type RondaTorreonOrderByWithAggregationInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
    estado?: SortOrder
    fechaApertura?: SortOrder
    fechaCierre?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RondaTorreonCountOrderByAggregateInput
    _avg?: RondaTorreonAvgOrderByAggregateInput
    _max?: RondaTorreonMaxOrderByAggregateInput
    _min?: RondaTorreonMinOrderByAggregateInput
    _sum?: RondaTorreonSumOrderByAggregateInput
  }

  export type RondaTorreonScalarWhereWithAggregatesInput = {
    AND?: RondaTorreonScalarWhereWithAggregatesInput | RondaTorreonScalarWhereWithAggregatesInput[]
    OR?: RondaTorreonScalarWhereWithAggregatesInput[]
    NOT?: RondaTorreonScalarWhereWithAggregatesInput | RondaTorreonScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"RondaTorreon"> | number
    localidadId?: IntWithAggregatesFilter<"RondaTorreon"> | number
    numeroRonda?: IntWithAggregatesFilter<"RondaTorreon"> | number
    estado?: EnumEstadoRondaTorreonWithAggregatesFilter<"RondaTorreon"> | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeWithAggregatesFilter<"RondaTorreon"> | Date | string
    fechaCierre?: DateTimeNullableWithAggregatesFilter<"RondaTorreon"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RondaTorreon"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RondaTorreon"> | Date | string
  }

  export type RondaTorreonMovimientoWhereInput = {
    AND?: RondaTorreonMovimientoWhereInput | RondaTorreonMovimientoWhereInput[]
    OR?: RondaTorreonMovimientoWhereInput[]
    NOT?: RondaTorreonMovimientoWhereInput | RondaTorreonMovimientoWhereInput[]
    id?: IntFilter<"RondaTorreonMovimiento"> | number
    rondaId?: IntFilter<"RondaTorreonMovimiento"> | number
    movimientoId?: IntFilter<"RondaTorreonMovimiento"> | number
    bloqueadoPorIncidenteId?: IntNullableFilter<"RondaTorreonMovimiento"> | number | null
    empresaId?: IntFilter<"RondaTorreonMovimiento"> | number
    orden?: IntFilter<"RondaTorreonMovimiento"> | number
    prioridad?: EnumPrioridadTorreonFilter<"RondaTorreonMovimiento"> | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFilter<"RondaTorreonMovimiento"> | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    fechaInicio?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    createdAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    updatedAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    ronda?: XOR<RondaTorreonScalarRelationFilter, RondaTorreonWhereInput>
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
    bloqueadoPorIncidente?: XOR<IncidenteTorreonFerroNullableScalarRelationFilter, IncidenteTorreonFerroWhereInput> | null
  }

  export type RondaTorreonMovimientoOrderByWithRelationInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrderInput | SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
    prioridad?: SortOrder
    estado?: SortOrder
    fechaAsignado?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ronda?: RondaTorreonOrderByWithRelationInput
    movimiento?: MovimientoTorreonFerroOrderByWithRelationInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroOrderByWithRelationInput
  }

  export type RondaTorreonMovimientoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    rondaId_movimientoId?: RondaTorreonMovimientoRondaIdMovimientoIdCompoundUniqueInput
    rondaId_orden?: RondaTorreonMovimientoRondaIdOrdenCompoundUniqueInput
    AND?: RondaTorreonMovimientoWhereInput | RondaTorreonMovimientoWhereInput[]
    OR?: RondaTorreonMovimientoWhereInput[]
    NOT?: RondaTorreonMovimientoWhereInput | RondaTorreonMovimientoWhereInput[]
    rondaId?: IntFilter<"RondaTorreonMovimiento"> | number
    movimientoId?: IntFilter<"RondaTorreonMovimiento"> | number
    bloqueadoPorIncidenteId?: IntNullableFilter<"RondaTorreonMovimiento"> | number | null
    empresaId?: IntFilter<"RondaTorreonMovimiento"> | number
    orden?: IntFilter<"RondaTorreonMovimiento"> | number
    prioridad?: EnumPrioridadTorreonFilter<"RondaTorreonMovimiento"> | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFilter<"RondaTorreonMovimiento"> | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    fechaInicio?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    createdAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    updatedAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    ronda?: XOR<RondaTorreonScalarRelationFilter, RondaTorreonWhereInput>
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
    bloqueadoPorIncidente?: XOR<IncidenteTorreonFerroNullableScalarRelationFilter, IncidenteTorreonFerroWhereInput> | null
  }, "id" | "rondaId_movimientoId" | "rondaId_orden">

  export type RondaTorreonMovimientoOrderByWithAggregationInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrderInput | SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
    prioridad?: SortOrder
    estado?: SortOrder
    fechaAsignado?: SortOrder
    fechaInicio?: SortOrderInput | SortOrder
    fechaFin?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RondaTorreonMovimientoCountOrderByAggregateInput
    _avg?: RondaTorreonMovimientoAvgOrderByAggregateInput
    _max?: RondaTorreonMovimientoMaxOrderByAggregateInput
    _min?: RondaTorreonMovimientoMinOrderByAggregateInput
    _sum?: RondaTorreonMovimientoSumOrderByAggregateInput
  }

  export type RondaTorreonMovimientoScalarWhereWithAggregatesInput = {
    AND?: RondaTorreonMovimientoScalarWhereWithAggregatesInput | RondaTorreonMovimientoScalarWhereWithAggregatesInput[]
    OR?: RondaTorreonMovimientoScalarWhereWithAggregatesInput[]
    NOT?: RondaTorreonMovimientoScalarWhereWithAggregatesInput | RondaTorreonMovimientoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"RondaTorreonMovimiento"> | number
    rondaId?: IntWithAggregatesFilter<"RondaTorreonMovimiento"> | number
    movimientoId?: IntWithAggregatesFilter<"RondaTorreonMovimiento"> | number
    bloqueadoPorIncidenteId?: IntNullableWithAggregatesFilter<"RondaTorreonMovimiento"> | number | null
    empresaId?: IntWithAggregatesFilter<"RondaTorreonMovimiento"> | number
    orden?: IntWithAggregatesFilter<"RondaTorreonMovimiento"> | number
    prioridad?: EnumPrioridadTorreonWithAggregatesFilter<"RondaTorreonMovimiento"> | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonWithAggregatesFilter<"RondaTorreonMovimiento"> | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeWithAggregatesFilter<"RondaTorreonMovimiento"> | Date | string
    fechaInicio?: DateTimeNullableWithAggregatesFilter<"RondaTorreonMovimiento"> | Date | string | null
    fechaFin?: DateTimeNullableWithAggregatesFilter<"RondaTorreonMovimiento"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RondaTorreonMovimiento"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RondaTorreonMovimiento"> | Date | string
  }

  export type IncidenteTorreonFerroWhereInput = {
    AND?: IncidenteTorreonFerroWhereInput | IncidenteTorreonFerroWhereInput[]
    OR?: IncidenteTorreonFerroWhereInput[]
    NOT?: IncidenteTorreonFerroWhereInput | IncidenteTorreonFerroWhereInput[]
    id?: IntFilter<"IncidenteTorreonFerro"> | number
    movimientoId?: IntFilter<"IncidenteTorreonFerro"> | number
    creadoPorId?: IntFilter<"IncidenteTorreonFerro"> | number
    resueltoPorId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    estado?: EnumEstadoIncidenteTorreonFilter<"IncidenteTorreonFerro"> | $Enums.EstadoIncidenteTorreon
    motivo?: StringFilter<"IncidenteTorreonFerro"> | string
    solucion?: StringNullableFilter<"IncidenteTorreonFerro"> | string | null
    localidadId?: IntFilter<"IncidenteTorreonFerro"> | number
    viaBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    seccionBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    fechaInicio?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    fechaResolucion?: DateTimeNullableFilter<"IncidenteTorreonFerro"> | Date | string | null
    createdAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
    rondasBloqueadas?: RondaTorreonMovimientoListRelationFilter
    fotos?: IncidenteTorreonFotoListRelationFilter
  }

  export type IncidenteTorreonFerroOrderByWithRelationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrderInput | SortOrder
    estado?: SortOrder
    motivo?: SortOrder
    solucion?: SortOrderInput | SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrderInput | SortOrder
    seccionBloqueadaId?: SortOrderInput | SortOrder
    fechaInicio?: SortOrder
    fechaResolucion?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    movimiento?: MovimientoTorreonFerroOrderByWithRelationInput
    rondasBloqueadas?: RondaTorreonMovimientoOrderByRelationAggregateInput
    fotos?: IncidenteTorreonFotoOrderByRelationAggregateInput
  }

  export type IncidenteTorreonFerroWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: IncidenteTorreonFerroWhereInput | IncidenteTorreonFerroWhereInput[]
    OR?: IncidenteTorreonFerroWhereInput[]
    NOT?: IncidenteTorreonFerroWhereInput | IncidenteTorreonFerroWhereInput[]
    movimientoId?: IntFilter<"IncidenteTorreonFerro"> | number
    creadoPorId?: IntFilter<"IncidenteTorreonFerro"> | number
    resueltoPorId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    estado?: EnumEstadoIncidenteTorreonFilter<"IncidenteTorreonFerro"> | $Enums.EstadoIncidenteTorreon
    motivo?: StringFilter<"IncidenteTorreonFerro"> | string
    solucion?: StringNullableFilter<"IncidenteTorreonFerro"> | string | null
    localidadId?: IntFilter<"IncidenteTorreonFerro"> | number
    viaBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    seccionBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    fechaInicio?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    fechaResolucion?: DateTimeNullableFilter<"IncidenteTorreonFerro"> | Date | string | null
    createdAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
    rondasBloqueadas?: RondaTorreonMovimientoListRelationFilter
    fotos?: IncidenteTorreonFotoListRelationFilter
  }, "id">

  export type IncidenteTorreonFerroOrderByWithAggregationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrderInput | SortOrder
    estado?: SortOrder
    motivo?: SortOrder
    solucion?: SortOrderInput | SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrderInput | SortOrder
    seccionBloqueadaId?: SortOrderInput | SortOrder
    fechaInicio?: SortOrder
    fechaResolucion?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: IncidenteTorreonFerroCountOrderByAggregateInput
    _avg?: IncidenteTorreonFerroAvgOrderByAggregateInput
    _max?: IncidenteTorreonFerroMaxOrderByAggregateInput
    _min?: IncidenteTorreonFerroMinOrderByAggregateInput
    _sum?: IncidenteTorreonFerroSumOrderByAggregateInput
  }

  export type IncidenteTorreonFerroScalarWhereWithAggregatesInput = {
    AND?: IncidenteTorreonFerroScalarWhereWithAggregatesInput | IncidenteTorreonFerroScalarWhereWithAggregatesInput[]
    OR?: IncidenteTorreonFerroScalarWhereWithAggregatesInput[]
    NOT?: IncidenteTorreonFerroScalarWhereWithAggregatesInput | IncidenteTorreonFerroScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"IncidenteTorreonFerro"> | number
    movimientoId?: IntWithAggregatesFilter<"IncidenteTorreonFerro"> | number
    creadoPorId?: IntWithAggregatesFilter<"IncidenteTorreonFerro"> | number
    resueltoPorId?: IntNullableWithAggregatesFilter<"IncidenteTorreonFerro"> | number | null
    estado?: EnumEstadoIncidenteTorreonWithAggregatesFilter<"IncidenteTorreonFerro"> | $Enums.EstadoIncidenteTorreon
    motivo?: StringWithAggregatesFilter<"IncidenteTorreonFerro"> | string
    solucion?: StringNullableWithAggregatesFilter<"IncidenteTorreonFerro"> | string | null
    localidadId?: IntWithAggregatesFilter<"IncidenteTorreonFerro"> | number
    viaBloqueadaId?: IntNullableWithAggregatesFilter<"IncidenteTorreonFerro"> | number | null
    seccionBloqueadaId?: IntNullableWithAggregatesFilter<"IncidenteTorreonFerro"> | number | null
    fechaInicio?: DateTimeWithAggregatesFilter<"IncidenteTorreonFerro"> | Date | string
    fechaResolucion?: DateTimeNullableWithAggregatesFilter<"IncidenteTorreonFerro"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"IncidenteTorreonFerro"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"IncidenteTorreonFerro"> | Date | string
  }

  export type MovimientoTorreonFotoWhereInput = {
    AND?: MovimientoTorreonFotoWhereInput | MovimientoTorreonFotoWhereInput[]
    OR?: MovimientoTorreonFotoWhereInput[]
    NOT?: MovimientoTorreonFotoWhereInput | MovimientoTorreonFotoWhereInput[]
    id?: IntFilter<"MovimientoTorreonFoto"> | number
    movimientoId?: IntFilter<"MovimientoTorreonFoto"> | number
    tipo?: EnumTipoFotoMovimientoTorreonFilter<"MovimientoTorreonFoto"> | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFilter<"MovimientoTorreonFoto"> | number
    url?: StringFilter<"MovimientoTorreonFoto"> | string
    storageKey?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"MovimientoTorreonFoto"> | number
    comentario?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
  }

  export type MovimientoTorreonFotoOrderByWithRelationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    tipo?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrderInput | SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrderInput | SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    movimiento?: MovimientoTorreonFerroOrderByWithRelationInput
  }

  export type MovimientoTorreonFotoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    movimientoId_tipo_orden?: MovimientoTorreonFotoMovimientoIdTipoOrdenCompoundUniqueInput
    AND?: MovimientoTorreonFotoWhereInput | MovimientoTorreonFotoWhereInput[]
    OR?: MovimientoTorreonFotoWhereInput[]
    NOT?: MovimientoTorreonFotoWhereInput | MovimientoTorreonFotoWhereInput[]
    movimientoId?: IntFilter<"MovimientoTorreonFoto"> | number
    tipo?: EnumTipoFotoMovimientoTorreonFilter<"MovimientoTorreonFoto"> | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFilter<"MovimientoTorreonFoto"> | number
    url?: StringFilter<"MovimientoTorreonFoto"> | string
    storageKey?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"MovimientoTorreonFoto"> | number
    comentario?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    movimiento?: XOR<MovimientoTorreonFerroScalarRelationFilter, MovimientoTorreonFerroWhereInput>
  }, "id" | "movimientoId_tipo_orden">

  export type MovimientoTorreonFotoOrderByWithAggregationInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    tipo?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrderInput | SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrderInput | SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MovimientoTorreonFotoCountOrderByAggregateInput
    _avg?: MovimientoTorreonFotoAvgOrderByAggregateInput
    _max?: MovimientoTorreonFotoMaxOrderByAggregateInput
    _min?: MovimientoTorreonFotoMinOrderByAggregateInput
    _sum?: MovimientoTorreonFotoSumOrderByAggregateInput
  }

  export type MovimientoTorreonFotoScalarWhereWithAggregatesInput = {
    AND?: MovimientoTorreonFotoScalarWhereWithAggregatesInput | MovimientoTorreonFotoScalarWhereWithAggregatesInput[]
    OR?: MovimientoTorreonFotoScalarWhereWithAggregatesInput[]
    NOT?: MovimientoTorreonFotoScalarWhereWithAggregatesInput | MovimientoTorreonFotoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"MovimientoTorreonFoto"> | number
    movimientoId?: IntWithAggregatesFilter<"MovimientoTorreonFoto"> | number
    tipo?: EnumTipoFotoMovimientoTorreonWithAggregatesFilter<"MovimientoTorreonFoto"> | $Enums.TipoFotoMovimientoTorreon
    orden?: IntWithAggregatesFilter<"MovimientoTorreonFoto"> | number
    url?: StringWithAggregatesFilter<"MovimientoTorreonFoto"> | string
    storageKey?: StringNullableWithAggregatesFilter<"MovimientoTorreonFoto"> | string | null
    tomadaPorId?: IntWithAggregatesFilter<"MovimientoTorreonFoto"> | number
    comentario?: StringNullableWithAggregatesFilter<"MovimientoTorreonFoto"> | string | null
    tomadaAt?: DateTimeWithAggregatesFilter<"MovimientoTorreonFoto"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"MovimientoTorreonFoto"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MovimientoTorreonFoto"> | Date | string
  }

  export type IncidenteTorreonFotoWhereInput = {
    AND?: IncidenteTorreonFotoWhereInput | IncidenteTorreonFotoWhereInput[]
    OR?: IncidenteTorreonFotoWhereInput[]
    NOT?: IncidenteTorreonFotoWhereInput | IncidenteTorreonFotoWhereInput[]
    id?: IntFilter<"IncidenteTorreonFoto"> | number
    incidenteId?: IntFilter<"IncidenteTorreonFoto"> | number
    orden?: IntFilter<"IncidenteTorreonFoto"> | number
    url?: StringFilter<"IncidenteTorreonFoto"> | string
    storageKey?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"IncidenteTorreonFoto"> | number
    comentario?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    incidente?: XOR<IncidenteTorreonFerroScalarRelationFilter, IncidenteTorreonFerroWhereInput>
  }

  export type IncidenteTorreonFotoOrderByWithRelationInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrderInput | SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrderInput | SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    incidente?: IncidenteTorreonFerroOrderByWithRelationInput
  }

  export type IncidenteTorreonFotoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    incidenteId_orden?: IncidenteTorreonFotoIncidenteIdOrdenCompoundUniqueInput
    AND?: IncidenteTorreonFotoWhereInput | IncidenteTorreonFotoWhereInput[]
    OR?: IncidenteTorreonFotoWhereInput[]
    NOT?: IncidenteTorreonFotoWhereInput | IncidenteTorreonFotoWhereInput[]
    incidenteId?: IntFilter<"IncidenteTorreonFoto"> | number
    orden?: IntFilter<"IncidenteTorreonFoto"> | number
    url?: StringFilter<"IncidenteTorreonFoto"> | string
    storageKey?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"IncidenteTorreonFoto"> | number
    comentario?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    incidente?: XOR<IncidenteTorreonFerroScalarRelationFilter, IncidenteTorreonFerroWhereInput>
  }, "id" | "incidenteId_orden">

  export type IncidenteTorreonFotoOrderByWithAggregationInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrderInput | SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrderInput | SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: IncidenteTorreonFotoCountOrderByAggregateInput
    _avg?: IncidenteTorreonFotoAvgOrderByAggregateInput
    _max?: IncidenteTorreonFotoMaxOrderByAggregateInput
    _min?: IncidenteTorreonFotoMinOrderByAggregateInput
    _sum?: IncidenteTorreonFotoSumOrderByAggregateInput
  }

  export type IncidenteTorreonFotoScalarWhereWithAggregatesInput = {
    AND?: IncidenteTorreonFotoScalarWhereWithAggregatesInput | IncidenteTorreonFotoScalarWhereWithAggregatesInput[]
    OR?: IncidenteTorreonFotoScalarWhereWithAggregatesInput[]
    NOT?: IncidenteTorreonFotoScalarWhereWithAggregatesInput | IncidenteTorreonFotoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"IncidenteTorreonFoto"> | number
    incidenteId?: IntWithAggregatesFilter<"IncidenteTorreonFoto"> | number
    orden?: IntWithAggregatesFilter<"IncidenteTorreonFoto"> | number
    url?: StringWithAggregatesFilter<"IncidenteTorreonFoto"> | string
    storageKey?: StringNullableWithAggregatesFilter<"IncidenteTorreonFoto"> | string | null
    tomadaPorId?: IntWithAggregatesFilter<"IncidenteTorreonFoto"> | number
    comentario?: StringNullableWithAggregatesFilter<"IncidenteTorreonFoto"> | string | null
    tomadaAt?: DateTimeWithAggregatesFilter<"IncidenteTorreonFoto"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"IncidenteTorreonFoto"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"IncidenteTorreonFoto"> | Date | string
  }

  export type MovimientoTorreonFerroCreateInput = {
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoCreateNestedManyWithoutMovimientoInput
    incidentes?: IncidenteTorreonFerroCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroUncheckedCreateInput = {
    id?: number
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutMovimientoInput
    incidentes?: IncidenteTorreonFerroUncheckedCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoUncheckedCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroUpdateInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUpdateManyWithoutMovimientoNestedInput
    incidentes?: IncidenteTorreonFerroUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUpdateManyWithoutMovimientoNestedInput
  }

  export type MovimientoTorreonFerroUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoNestedInput
    incidentes?: IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoNestedInput
  }

  export type MovimientoTorreonFerroCreateManyInput = {
    id?: number
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFerroUpdateManyMutationInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFerroUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonCreateInput = {
    localidadId: number
    numeroRonda: number
    estado?: $Enums.EstadoRondaTorreon
    fechaApertura?: Date | string
    fechaCierre?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimientos?: RondaTorreonMovimientoCreateNestedManyWithoutRondaInput
  }

  export type RondaTorreonUncheckedCreateInput = {
    id?: number
    localidadId: number
    numeroRonda: number
    estado?: $Enums.EstadoRondaTorreon
    fechaApertura?: Date | string
    fechaCierre?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimientos?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutRondaInput
  }

  export type RondaTorreonUpdateInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimientos?: RondaTorreonMovimientoUpdateManyWithoutRondaNestedInput
  }

  export type RondaTorreonUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimientos?: RondaTorreonMovimientoUncheckedUpdateManyWithoutRondaNestedInput
  }

  export type RondaTorreonCreateManyInput = {
    id?: number
    localidadId: number
    numeroRonda: number
    estado?: $Enums.EstadoRondaTorreon
    fechaApertura?: Date | string
    fechaCierre?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonUpdateManyMutationInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoCreateInput = {
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ronda: RondaTorreonCreateNestedOneWithoutMovimientosInput
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutRondasInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroCreateNestedOneWithoutRondasBloqueadasInput
  }

  export type RondaTorreonMovimientoUncheckedCreateInput = {
    id?: number
    rondaId: number
    movimientoId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoUpdateInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ronda?: RondaTorreonUpdateOneRequiredWithoutMovimientosNestedInput
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutRondasNestedInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroUpdateOneWithoutRondasBloqueadasNestedInput
  }

  export type RondaTorreonMovimientoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoCreateManyInput = {
    id?: number
    rondaId: number
    movimientoId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoUpdateManyMutationInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFerroCreateInput = {
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutIncidentesInput
    rondasBloqueadas?: RondaTorreonMovimientoCreateNestedManyWithoutBloqueadoPorIncidenteInput
    fotos?: IncidenteTorreonFotoCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroUncheckedCreateInput = {
    id?: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutBloqueadoPorIncidenteInput
    fotos?: IncidenteTorreonFotoUncheckedCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroUpdateInput = {
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutIncidentesNestedInput
    rondasBloqueadas?: RondaTorreonMovimientoUpdateManyWithoutBloqueadoPorIncidenteNestedInput
    fotos?: IncidenteTorreonFotoUpdateManyWithoutIncidenteNestedInput
  }

  export type IncidenteTorreonFerroUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteNestedInput
    fotos?: IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteNestedInput
  }

  export type IncidenteTorreonFerroCreateManyInput = {
    id?: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFerroUpdateManyMutationInput = {
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFerroUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoCreateInput = {
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutFotosInput
  }

  export type MovimientoTorreonFotoUncheckedCreateInput = {
    id?: number
    movimientoId: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFotoUpdateInput = {
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutFotosNestedInput
  }

  export type MovimientoTorreonFotoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoCreateManyInput = {
    id?: number
    movimientoId: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFotoUpdateManyMutationInput = {
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoCreateInput = {
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    incidente: IncidenteTorreonFerroCreateNestedOneWithoutFotosInput
  }

  export type IncidenteTorreonFotoUncheckedCreateInput = {
    id?: number
    incidenteId: number
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFotoUpdateInput = {
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    incidente?: IncidenteTorreonFerroUpdateOneRequiredWithoutFotosNestedInput
  }

  export type IncidenteTorreonFotoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    incidenteId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoCreateManyInput = {
    id?: number
    incidenteId: number
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFotoUpdateManyMutationInput = {
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    incidenteId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type EnumPrioridadTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadTorreon | EnumPrioridadTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumPrioridadTorreonFilter<$PrismaModel> | $Enums.PrioridadTorreon
  }

  export type EnumTipoMovimientoTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMovimientoTorreon | EnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel> | $Enums.TipoMovimientoTorreon | null
  }

  export type EnumEstadoMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoMovimientoTorreon | EnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel> | $Enums.EstadoMovimientoTorreon
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

  export type EnumPosicionChimeneaTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionChimeneaTorreon | EnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel> | $Enums.PosicionChimeneaTorreon | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumDireccionEmpujeTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.DireccionEmpujeTorreon | EnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel> | $Enums.DireccionEmpujeTorreon | null
  }

  export type EnumPosicionCabinaTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionCabinaTorreon | EnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel> | $Enums.PosicionCabinaTorreon | null
  }

  export type RondaTorreonMovimientoListRelationFilter = {
    every?: RondaTorreonMovimientoWhereInput
    some?: RondaTorreonMovimientoWhereInput
    none?: RondaTorreonMovimientoWhereInput
  }

  export type IncidenteTorreonFerroListRelationFilter = {
    every?: IncidenteTorreonFerroWhereInput
    some?: IncidenteTorreonFerroWhereInput
    none?: IncidenteTorreonFerroWhereInput
  }

  export type MovimientoTorreonFotoListRelationFilter = {
    every?: MovimientoTorreonFotoWhereInput
    some?: MovimientoTorreonFotoWhereInput
    none?: MovimientoTorreonFotoWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RondaTorreonMovimientoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type IncidenteTorreonFerroOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MovimientoTorreonFotoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MovimientoTorreonFerroCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrder
    supervisorId?: SortOrder
    coordinadorId?: SortOrder
    operadorId?: SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrder
    viaDestinoId?: SortOrder
    seccionOrigenId?: SortOrder
    seccionDestinoId?: SortOrder
    locomotiveNumber?: SortOrder
    prioridad?: SortOrder
    tipoMovimiento?: SortOrder
    estado?: SortOrder
    fechaSolicitud?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    fechaPausa?: SortOrder
    instrucciones?: SortOrder
    posicionChimenea?: SortOrder
    finalizado?: SortOrder
    direccionEmpuje?: SortOrder
    posicionCabina?: SortOrder
    empresaNombreSnapshot?: SortOrder
    localidadNombreSnapshot?: SortOrder
    viaOrigenNombreSnapshot?: SortOrder
    viaDestinoNombreSnapshot?: SortOrder
    seccionOrigenNombreSnapshot?: SortOrder
    seccionDestinoNombreSnapshot?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFerroAvgOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrder
    supervisorId?: SortOrder
    coordinadorId?: SortOrder
    operadorId?: SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrder
    viaDestinoId?: SortOrder
    seccionOrigenId?: SortOrder
    seccionDestinoId?: SortOrder
    locomotiveNumber?: SortOrder
  }

  export type MovimientoTorreonFerroMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrder
    supervisorId?: SortOrder
    coordinadorId?: SortOrder
    operadorId?: SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrder
    viaDestinoId?: SortOrder
    seccionOrigenId?: SortOrder
    seccionDestinoId?: SortOrder
    locomotiveNumber?: SortOrder
    prioridad?: SortOrder
    tipoMovimiento?: SortOrder
    estado?: SortOrder
    fechaSolicitud?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    fechaPausa?: SortOrder
    instrucciones?: SortOrder
    posicionChimenea?: SortOrder
    finalizado?: SortOrder
    direccionEmpuje?: SortOrder
    posicionCabina?: SortOrder
    empresaNombreSnapshot?: SortOrder
    localidadNombreSnapshot?: SortOrder
    viaOrigenNombreSnapshot?: SortOrder
    viaDestinoNombreSnapshot?: SortOrder
    seccionOrigenNombreSnapshot?: SortOrder
    seccionDestinoNombreSnapshot?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFerroMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrder
    supervisorId?: SortOrder
    coordinadorId?: SortOrder
    operadorId?: SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrder
    viaDestinoId?: SortOrder
    seccionOrigenId?: SortOrder
    seccionDestinoId?: SortOrder
    locomotiveNumber?: SortOrder
    prioridad?: SortOrder
    tipoMovimiento?: SortOrder
    estado?: SortOrder
    fechaSolicitud?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    fechaPausa?: SortOrder
    instrucciones?: SortOrder
    posicionChimenea?: SortOrder
    finalizado?: SortOrder
    direccionEmpuje?: SortOrder
    posicionCabina?: SortOrder
    empresaNombreSnapshot?: SortOrder
    localidadNombreSnapshot?: SortOrder
    viaOrigenNombreSnapshot?: SortOrder
    viaDestinoNombreSnapshot?: SortOrder
    seccionOrigenNombreSnapshot?: SortOrder
    seccionDestinoNombreSnapshot?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFerroSumOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    creadoPorId?: SortOrder
    clienteId?: SortOrder
    supervisorId?: SortOrder
    coordinadorId?: SortOrder
    operadorId?: SortOrder
    localidadId?: SortOrder
    viaOrigenId?: SortOrder
    viaDestinoId?: SortOrder
    seccionOrigenId?: SortOrder
    seccionDestinoId?: SortOrder
    locomotiveNumber?: SortOrder
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

  export type EnumPrioridadTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadTorreon | EnumPrioridadTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumPrioridadTorreonWithAggregatesFilter<$PrismaModel> | $Enums.PrioridadTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrioridadTorreonFilter<$PrismaModel>
    _max?: NestedEnumPrioridadTorreonFilter<$PrismaModel>
  }

  export type EnumTipoMovimientoTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMovimientoTorreon | EnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTipoMovimientoTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.TipoMovimientoTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel>
  }

  export type EnumEstadoMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoMovimientoTorreon | EnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel>
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

  export type EnumPosicionChimeneaTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionChimeneaTorreon | EnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionChimeneaTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.PosicionChimeneaTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumDireccionEmpujeTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DireccionEmpujeTorreon | EnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDireccionEmpujeTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.DireccionEmpujeTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel>
  }

  export type EnumPosicionCabinaTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionCabinaTorreon | EnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionCabinaTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.PosicionCabinaTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel>
  }

  export type EnumEstadoRondaTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaTorreon | EnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel> | $Enums.EstadoRondaTorreon
  }

  export type RondaTorreonCountOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
    estado?: SortOrder
    fechaApertura?: SortOrder
    fechaCierre?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonAvgOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
  }

  export type RondaTorreonMaxOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
    estado?: SortOrder
    fechaApertura?: SortOrder
    fechaCierre?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonMinOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
    estado?: SortOrder
    fechaApertura?: SortOrder
    fechaCierre?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonSumOrderByAggregateInput = {
    id?: SortOrder
    localidadId?: SortOrder
    numeroRonda?: SortOrder
  }

  export type EnumEstadoRondaTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaTorreon | EnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel>
  }

  export type EnumEstadoRondaMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaMovimientoTorreon | EnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel> | $Enums.EstadoRondaMovimientoTorreon
  }

  export type RondaTorreonScalarRelationFilter = {
    is?: RondaTorreonWhereInput
    isNot?: RondaTorreonWhereInput
  }

  export type MovimientoTorreonFerroScalarRelationFilter = {
    is?: MovimientoTorreonFerroWhereInput
    isNot?: MovimientoTorreonFerroWhereInput
  }

  export type IncidenteTorreonFerroNullableScalarRelationFilter = {
    is?: IncidenteTorreonFerroWhereInput | null
    isNot?: IncidenteTorreonFerroWhereInput | null
  }

  export type RondaTorreonMovimientoRondaIdMovimientoIdCompoundUniqueInput = {
    rondaId: number
    movimientoId: number
  }

  export type RondaTorreonMovimientoRondaIdOrdenCompoundUniqueInput = {
    rondaId: number
    orden: number
  }

  export type RondaTorreonMovimientoCountOrderByAggregateInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
    prioridad?: SortOrder
    estado?: SortOrder
    fechaAsignado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonMovimientoAvgOrderByAggregateInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
  }

  export type RondaTorreonMovimientoMaxOrderByAggregateInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
    prioridad?: SortOrder
    estado?: SortOrder
    fechaAsignado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonMovimientoMinOrderByAggregateInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
    prioridad?: SortOrder
    estado?: SortOrder
    fechaAsignado?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RondaTorreonMovimientoSumOrderByAggregateInput = {
    id?: SortOrder
    rondaId?: SortOrder
    movimientoId?: SortOrder
    bloqueadoPorIncidenteId?: SortOrder
    empresaId?: SortOrder
    orden?: SortOrder
  }

  export type EnumEstadoRondaMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaMovimientoTorreon | EnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel>
  }

  export type EnumEstadoIncidenteTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTorreon | EnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel> | $Enums.EstadoIncidenteTorreon
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

  export type IncidenteTorreonFotoListRelationFilter = {
    every?: IncidenteTorreonFotoWhereInput
    some?: IncidenteTorreonFotoWhereInput
    none?: IncidenteTorreonFotoWhereInput
  }

  export type IncidenteTorreonFotoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type IncidenteTorreonFerroCountOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrder
    estado?: SortOrder
    motivo?: SortOrder
    solucion?: SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrder
    seccionBloqueadaId?: SortOrder
    fechaInicio?: SortOrder
    fechaResolucion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFerroAvgOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrder
    seccionBloqueadaId?: SortOrder
  }

  export type IncidenteTorreonFerroMaxOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrder
    estado?: SortOrder
    motivo?: SortOrder
    solucion?: SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrder
    seccionBloqueadaId?: SortOrder
    fechaInicio?: SortOrder
    fechaResolucion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFerroMinOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrder
    estado?: SortOrder
    motivo?: SortOrder
    solucion?: SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrder
    seccionBloqueadaId?: SortOrder
    fechaInicio?: SortOrder
    fechaResolucion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFerroSumOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    creadoPorId?: SortOrder
    resueltoPorId?: SortOrder
    localidadId?: SortOrder
    viaBloqueadaId?: SortOrder
    seccionBloqueadaId?: SortOrder
  }

  export type EnumEstadoIncidenteTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTorreon | EnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel>
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

  export type EnumTipoFotoMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFotoMovimientoTorreon | EnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel> | $Enums.TipoFotoMovimientoTorreon
  }

  export type MovimientoTorreonFotoMovimientoIdTipoOrdenCompoundUniqueInput = {
    movimientoId: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden: number
  }

  export type MovimientoTorreonFotoCountOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    tipo?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFotoAvgOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    orden?: SortOrder
    tomadaPorId?: SortOrder
  }

  export type MovimientoTorreonFotoMaxOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    tipo?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFotoMinOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    tipo?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MovimientoTorreonFotoSumOrderByAggregateInput = {
    id?: SortOrder
    movimientoId?: SortOrder
    orden?: SortOrder
    tomadaPorId?: SortOrder
  }

  export type EnumTipoFotoMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFotoMovimientoTorreon | EnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFotoMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.TipoFotoMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel>
  }

  export type IncidenteTorreonFerroScalarRelationFilter = {
    is?: IncidenteTorreonFerroWhereInput
    isNot?: IncidenteTorreonFerroWhereInput
  }

  export type IncidenteTorreonFotoIncidenteIdOrdenCompoundUniqueInput = {
    incidenteId: number
    orden: number
  }

  export type IncidenteTorreonFotoCountOrderByAggregateInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFotoAvgOrderByAggregateInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    tomadaPorId?: SortOrder
  }

  export type IncidenteTorreonFotoMaxOrderByAggregateInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFotoMinOrderByAggregateInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    url?: SortOrder
    storageKey?: SortOrder
    tomadaPorId?: SortOrder
    comentario?: SortOrder
    tomadaAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IncidenteTorreonFotoSumOrderByAggregateInput = {
    id?: SortOrder
    incidenteId?: SortOrder
    orden?: SortOrder
    tomadaPorId?: SortOrder
  }

  export type RondaTorreonMovimientoCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput> | RondaTorreonMovimientoCreateWithoutMovimientoInput[] | RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput | RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput[]
    createMany?: RondaTorreonMovimientoCreateManyMovimientoInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type IncidenteTorreonFerroCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput> | IncidenteTorreonFerroCreateWithoutMovimientoInput[] | IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput | IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput[]
    createMany?: IncidenteTorreonFerroCreateManyMovimientoInputEnvelope
    connect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
  }

  export type MovimientoTorreonFotoCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput> | MovimientoTorreonFotoCreateWithoutMovimientoInput[] | MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput | MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput[]
    createMany?: MovimientoTorreonFotoCreateManyMovimientoInputEnvelope
    connect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
  }

  export type RondaTorreonMovimientoUncheckedCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput> | RondaTorreonMovimientoCreateWithoutMovimientoInput[] | RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput | RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput[]
    createMany?: RondaTorreonMovimientoCreateManyMovimientoInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type IncidenteTorreonFerroUncheckedCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput> | IncidenteTorreonFerroCreateWithoutMovimientoInput[] | IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput | IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput[]
    createMany?: IncidenteTorreonFerroCreateManyMovimientoInputEnvelope
    connect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
  }

  export type MovimientoTorreonFotoUncheckedCreateNestedManyWithoutMovimientoInput = {
    create?: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput> | MovimientoTorreonFotoCreateWithoutMovimientoInput[] | MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput | MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput[]
    createMany?: MovimientoTorreonFotoCreateManyMovimientoInputEnvelope
    connect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumPrioridadTorreonFieldUpdateOperationsInput = {
    set?: $Enums.PrioridadTorreon
  }

  export type NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput = {
    set?: $Enums.TipoMovimientoTorreon | null
  }

  export type EnumEstadoMovimientoTorreonFieldUpdateOperationsInput = {
    set?: $Enums.EstadoMovimientoTorreon
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput = {
    set?: $Enums.PosicionChimeneaTorreon | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput = {
    set?: $Enums.DireccionEmpujeTorreon | null
  }

  export type NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput = {
    set?: $Enums.PosicionCabinaTorreon | null
  }

  export type RondaTorreonMovimientoUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput> | RondaTorreonMovimientoCreateWithoutMovimientoInput[] | RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput | RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutMovimientoInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: RondaTorreonMovimientoCreateManyMovimientoInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutMovimientoInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutMovimientoInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type IncidenteTorreonFerroUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput> | IncidenteTorreonFerroCreateWithoutMovimientoInput[] | IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput | IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput[]
    upsert?: IncidenteTorreonFerroUpsertWithWhereUniqueWithoutMovimientoInput | IncidenteTorreonFerroUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: IncidenteTorreonFerroCreateManyMovimientoInputEnvelope
    set?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    disconnect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    delete?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    connect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    update?: IncidenteTorreonFerroUpdateWithWhereUniqueWithoutMovimientoInput | IncidenteTorreonFerroUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: IncidenteTorreonFerroUpdateManyWithWhereWithoutMovimientoInput | IncidenteTorreonFerroUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: IncidenteTorreonFerroScalarWhereInput | IncidenteTorreonFerroScalarWhereInput[]
  }

  export type MovimientoTorreonFotoUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput> | MovimientoTorreonFotoCreateWithoutMovimientoInput[] | MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput | MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput[]
    upsert?: MovimientoTorreonFotoUpsertWithWhereUniqueWithoutMovimientoInput | MovimientoTorreonFotoUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: MovimientoTorreonFotoCreateManyMovimientoInputEnvelope
    set?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    disconnect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    delete?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    connect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    update?: MovimientoTorreonFotoUpdateWithWhereUniqueWithoutMovimientoInput | MovimientoTorreonFotoUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: MovimientoTorreonFotoUpdateManyWithWhereWithoutMovimientoInput | MovimientoTorreonFotoUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: MovimientoTorreonFotoScalarWhereInput | MovimientoTorreonFotoScalarWhereInput[]
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput> | RondaTorreonMovimientoCreateWithoutMovimientoInput[] | RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput | RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutMovimientoInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: RondaTorreonMovimientoCreateManyMovimientoInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutMovimientoInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutMovimientoInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput> | IncidenteTorreonFerroCreateWithoutMovimientoInput[] | IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput | IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput[]
    upsert?: IncidenteTorreonFerroUpsertWithWhereUniqueWithoutMovimientoInput | IncidenteTorreonFerroUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: IncidenteTorreonFerroCreateManyMovimientoInputEnvelope
    set?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    disconnect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    delete?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    connect?: IncidenteTorreonFerroWhereUniqueInput | IncidenteTorreonFerroWhereUniqueInput[]
    update?: IncidenteTorreonFerroUpdateWithWhereUniqueWithoutMovimientoInput | IncidenteTorreonFerroUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: IncidenteTorreonFerroUpdateManyWithWhereWithoutMovimientoInput | IncidenteTorreonFerroUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: IncidenteTorreonFerroScalarWhereInput | IncidenteTorreonFerroScalarWhereInput[]
  }

  export type MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoNestedInput = {
    create?: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput> | MovimientoTorreonFotoCreateWithoutMovimientoInput[] | MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput[]
    connectOrCreate?: MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput | MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput[]
    upsert?: MovimientoTorreonFotoUpsertWithWhereUniqueWithoutMovimientoInput | MovimientoTorreonFotoUpsertWithWhereUniqueWithoutMovimientoInput[]
    createMany?: MovimientoTorreonFotoCreateManyMovimientoInputEnvelope
    set?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    disconnect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    delete?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    connect?: MovimientoTorreonFotoWhereUniqueInput | MovimientoTorreonFotoWhereUniqueInput[]
    update?: MovimientoTorreonFotoUpdateWithWhereUniqueWithoutMovimientoInput | MovimientoTorreonFotoUpdateWithWhereUniqueWithoutMovimientoInput[]
    updateMany?: MovimientoTorreonFotoUpdateManyWithWhereWithoutMovimientoInput | MovimientoTorreonFotoUpdateManyWithWhereWithoutMovimientoInput[]
    deleteMany?: MovimientoTorreonFotoScalarWhereInput | MovimientoTorreonFotoScalarWhereInput[]
  }

  export type RondaTorreonMovimientoCreateNestedManyWithoutRondaInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput> | RondaTorreonMovimientoCreateWithoutRondaInput[] | RondaTorreonMovimientoUncheckedCreateWithoutRondaInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutRondaInput | RondaTorreonMovimientoCreateOrConnectWithoutRondaInput[]
    createMany?: RondaTorreonMovimientoCreateManyRondaInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type RondaTorreonMovimientoUncheckedCreateNestedManyWithoutRondaInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput> | RondaTorreonMovimientoCreateWithoutRondaInput[] | RondaTorreonMovimientoUncheckedCreateWithoutRondaInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutRondaInput | RondaTorreonMovimientoCreateOrConnectWithoutRondaInput[]
    createMany?: RondaTorreonMovimientoCreateManyRondaInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type EnumEstadoRondaTorreonFieldUpdateOperationsInput = {
    set?: $Enums.EstadoRondaTorreon
  }

  export type RondaTorreonMovimientoUpdateManyWithoutRondaNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput> | RondaTorreonMovimientoCreateWithoutRondaInput[] | RondaTorreonMovimientoUncheckedCreateWithoutRondaInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutRondaInput | RondaTorreonMovimientoCreateOrConnectWithoutRondaInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutRondaInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutRondaInput[]
    createMany?: RondaTorreonMovimientoCreateManyRondaInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutRondaInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutRondaInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutRondaInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutRondaInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutRondaNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput> | RondaTorreonMovimientoCreateWithoutRondaInput[] | RondaTorreonMovimientoUncheckedCreateWithoutRondaInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutRondaInput | RondaTorreonMovimientoCreateOrConnectWithoutRondaInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutRondaInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutRondaInput[]
    createMany?: RondaTorreonMovimientoCreateManyRondaInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutRondaInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutRondaInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutRondaInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutRondaInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type RondaTorreonCreateNestedOneWithoutMovimientosInput = {
    create?: XOR<RondaTorreonCreateWithoutMovimientosInput, RondaTorreonUncheckedCreateWithoutMovimientosInput>
    connectOrCreate?: RondaTorreonCreateOrConnectWithoutMovimientosInput
    connect?: RondaTorreonWhereUniqueInput
  }

  export type MovimientoTorreonFerroCreateNestedOneWithoutRondasInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutRondasInput, MovimientoTorreonFerroUncheckedCreateWithoutRondasInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutRondasInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
  }

  export type IncidenteTorreonFerroCreateNestedOneWithoutRondasBloqueadasInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedCreateWithoutRondasBloqueadasInput>
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutRondasBloqueadasInput
    connect?: IncidenteTorreonFerroWhereUniqueInput
  }

  export type EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput = {
    set?: $Enums.EstadoRondaMovimientoTorreon
  }

  export type RondaTorreonUpdateOneRequiredWithoutMovimientosNestedInput = {
    create?: XOR<RondaTorreonCreateWithoutMovimientosInput, RondaTorreonUncheckedCreateWithoutMovimientosInput>
    connectOrCreate?: RondaTorreonCreateOrConnectWithoutMovimientosInput
    upsert?: RondaTorreonUpsertWithoutMovimientosInput
    connect?: RondaTorreonWhereUniqueInput
    update?: XOR<XOR<RondaTorreonUpdateToOneWithWhereWithoutMovimientosInput, RondaTorreonUpdateWithoutMovimientosInput>, RondaTorreonUncheckedUpdateWithoutMovimientosInput>
  }

  export type MovimientoTorreonFerroUpdateOneRequiredWithoutRondasNestedInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutRondasInput, MovimientoTorreonFerroUncheckedCreateWithoutRondasInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutRondasInput
    upsert?: MovimientoTorreonFerroUpsertWithoutRondasInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
    update?: XOR<XOR<MovimientoTorreonFerroUpdateToOneWithWhereWithoutRondasInput, MovimientoTorreonFerroUpdateWithoutRondasInput>, MovimientoTorreonFerroUncheckedUpdateWithoutRondasInput>
  }

  export type IncidenteTorreonFerroUpdateOneWithoutRondasBloqueadasNestedInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedCreateWithoutRondasBloqueadasInput>
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutRondasBloqueadasInput
    upsert?: IncidenteTorreonFerroUpsertWithoutRondasBloqueadasInput
    disconnect?: IncidenteTorreonFerroWhereInput | boolean
    delete?: IncidenteTorreonFerroWhereInput | boolean
    connect?: IncidenteTorreonFerroWhereUniqueInput
    update?: XOR<XOR<IncidenteTorreonFerroUpdateToOneWithWhereWithoutRondasBloqueadasInput, IncidenteTorreonFerroUpdateWithoutRondasBloqueadasInput>, IncidenteTorreonFerroUncheckedUpdateWithoutRondasBloqueadasInput>
  }

  export type MovimientoTorreonFerroCreateNestedOneWithoutIncidentesInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutIncidentesInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
  }

  export type RondaTorreonMovimientoCreateNestedManyWithoutBloqueadoPorIncidenteInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput> | RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput[] | RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput[]
    createMany?: RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type IncidenteTorreonFotoCreateNestedManyWithoutIncidenteInput = {
    create?: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput> | IncidenteTorreonFotoCreateWithoutIncidenteInput[] | IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput[]
    connectOrCreate?: IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput | IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput[]
    createMany?: IncidenteTorreonFotoCreateManyIncidenteInputEnvelope
    connect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
  }

  export type RondaTorreonMovimientoUncheckedCreateNestedManyWithoutBloqueadoPorIncidenteInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput> | RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput[] | RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput[]
    createMany?: RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInputEnvelope
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
  }

  export type IncidenteTorreonFotoUncheckedCreateNestedManyWithoutIncidenteInput = {
    create?: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput> | IncidenteTorreonFotoCreateWithoutIncidenteInput[] | IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput[]
    connectOrCreate?: IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput | IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput[]
    createMany?: IncidenteTorreonFotoCreateManyIncidenteInputEnvelope
    connect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
  }

  export type EnumEstadoIncidenteTorreonFieldUpdateOperationsInput = {
    set?: $Enums.EstadoIncidenteTorreon
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type MovimientoTorreonFerroUpdateOneRequiredWithoutIncidentesNestedInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedCreateWithoutIncidentesInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutIncidentesInput
    upsert?: MovimientoTorreonFerroUpsertWithoutIncidentesInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
    update?: XOR<XOR<MovimientoTorreonFerroUpdateToOneWithWhereWithoutIncidentesInput, MovimientoTorreonFerroUpdateWithoutIncidentesInput>, MovimientoTorreonFerroUncheckedUpdateWithoutIncidentesInput>
  }

  export type RondaTorreonMovimientoUpdateManyWithoutBloqueadoPorIncidenteNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput> | RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput[] | RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutBloqueadoPorIncidenteInput[]
    createMany?: RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutBloqueadoPorIncidenteInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutBloqueadoPorIncidenteInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type IncidenteTorreonFotoUpdateManyWithoutIncidenteNestedInput = {
    create?: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput> | IncidenteTorreonFotoCreateWithoutIncidenteInput[] | IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput[]
    connectOrCreate?: IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput | IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput[]
    upsert?: IncidenteTorreonFotoUpsertWithWhereUniqueWithoutIncidenteInput | IncidenteTorreonFotoUpsertWithWhereUniqueWithoutIncidenteInput[]
    createMany?: IncidenteTorreonFotoCreateManyIncidenteInputEnvelope
    set?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    disconnect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    delete?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    connect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    update?: IncidenteTorreonFotoUpdateWithWhereUniqueWithoutIncidenteInput | IncidenteTorreonFotoUpdateWithWhereUniqueWithoutIncidenteInput[]
    updateMany?: IncidenteTorreonFotoUpdateManyWithWhereWithoutIncidenteInput | IncidenteTorreonFotoUpdateManyWithWhereWithoutIncidenteInput[]
    deleteMany?: IncidenteTorreonFotoScalarWhereInput | IncidenteTorreonFotoScalarWhereInput[]
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteNestedInput = {
    create?: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput> | RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput[] | RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput[]
    connectOrCreate?: RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput[]
    upsert?: RondaTorreonMovimientoUpsertWithWhereUniqueWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpsertWithWhereUniqueWithoutBloqueadoPorIncidenteInput[]
    createMany?: RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInputEnvelope
    set?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    disconnect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    delete?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    connect?: RondaTorreonMovimientoWhereUniqueInput | RondaTorreonMovimientoWhereUniqueInput[]
    update?: RondaTorreonMovimientoUpdateWithWhereUniqueWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpdateWithWhereUniqueWithoutBloqueadoPorIncidenteInput[]
    updateMany?: RondaTorreonMovimientoUpdateManyWithWhereWithoutBloqueadoPorIncidenteInput | RondaTorreonMovimientoUpdateManyWithWhereWithoutBloqueadoPorIncidenteInput[]
    deleteMany?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
  }

  export type IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteNestedInput = {
    create?: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput> | IncidenteTorreonFotoCreateWithoutIncidenteInput[] | IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput[]
    connectOrCreate?: IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput | IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput[]
    upsert?: IncidenteTorreonFotoUpsertWithWhereUniqueWithoutIncidenteInput | IncidenteTorreonFotoUpsertWithWhereUniqueWithoutIncidenteInput[]
    createMany?: IncidenteTorreonFotoCreateManyIncidenteInputEnvelope
    set?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    disconnect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    delete?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    connect?: IncidenteTorreonFotoWhereUniqueInput | IncidenteTorreonFotoWhereUniqueInput[]
    update?: IncidenteTorreonFotoUpdateWithWhereUniqueWithoutIncidenteInput | IncidenteTorreonFotoUpdateWithWhereUniqueWithoutIncidenteInput[]
    updateMany?: IncidenteTorreonFotoUpdateManyWithWhereWithoutIncidenteInput | IncidenteTorreonFotoUpdateManyWithWhereWithoutIncidenteInput[]
    deleteMany?: IncidenteTorreonFotoScalarWhereInput | IncidenteTorreonFotoScalarWhereInput[]
  }

  export type MovimientoTorreonFerroCreateNestedOneWithoutFotosInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutFotosInput, MovimientoTorreonFerroUncheckedCreateWithoutFotosInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutFotosInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
  }

  export type EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput = {
    set?: $Enums.TipoFotoMovimientoTorreon
  }

  export type MovimientoTorreonFerroUpdateOneRequiredWithoutFotosNestedInput = {
    create?: XOR<MovimientoTorreonFerroCreateWithoutFotosInput, MovimientoTorreonFerroUncheckedCreateWithoutFotosInput>
    connectOrCreate?: MovimientoTorreonFerroCreateOrConnectWithoutFotosInput
    upsert?: MovimientoTorreonFerroUpsertWithoutFotosInput
    connect?: MovimientoTorreonFerroWhereUniqueInput
    update?: XOR<XOR<MovimientoTorreonFerroUpdateToOneWithWhereWithoutFotosInput, MovimientoTorreonFerroUpdateWithoutFotosInput>, MovimientoTorreonFerroUncheckedUpdateWithoutFotosInput>
  }

  export type IncidenteTorreonFerroCreateNestedOneWithoutFotosInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutFotosInput, IncidenteTorreonFerroUncheckedCreateWithoutFotosInput>
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutFotosInput
    connect?: IncidenteTorreonFerroWhereUniqueInput
  }

  export type IncidenteTorreonFerroUpdateOneRequiredWithoutFotosNestedInput = {
    create?: XOR<IncidenteTorreonFerroCreateWithoutFotosInput, IncidenteTorreonFerroUncheckedCreateWithoutFotosInput>
    connectOrCreate?: IncidenteTorreonFerroCreateOrConnectWithoutFotosInput
    upsert?: IncidenteTorreonFerroUpsertWithoutFotosInput
    connect?: IncidenteTorreonFerroWhereUniqueInput
    update?: XOR<XOR<IncidenteTorreonFerroUpdateToOneWithWhereWithoutFotosInput, IncidenteTorreonFerroUpdateWithoutFotosInput>, IncidenteTorreonFerroUncheckedUpdateWithoutFotosInput>
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

  export type NestedEnumPrioridadTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadTorreon | EnumPrioridadTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumPrioridadTorreonFilter<$PrismaModel> | $Enums.PrioridadTorreon
  }

  export type NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMovimientoTorreon | EnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel> | $Enums.TipoMovimientoTorreon | null
  }

  export type NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoMovimientoTorreon | EnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel> | $Enums.EstadoMovimientoTorreon
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

  export type NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionChimeneaTorreon | EnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel> | $Enums.PosicionChimeneaTorreon | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.DireccionEmpujeTorreon | EnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel> | $Enums.DireccionEmpujeTorreon | null
  }

  export type NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionCabinaTorreon | EnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel> | $Enums.PosicionCabinaTorreon | null
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

  export type NestedEnumPrioridadTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadTorreon | EnumPrioridadTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.PrioridadTorreon[] | ListEnumPrioridadTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumPrioridadTorreonWithAggregatesFilter<$PrismaModel> | $Enums.PrioridadTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrioridadTorreonFilter<$PrismaModel>
    _max?: NestedEnumPrioridadTorreonFilter<$PrismaModel>
  }

  export type NestedEnumTipoMovimientoTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMovimientoTorreon | EnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.TipoMovimientoTorreon[] | ListEnumTipoMovimientoTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumTipoMovimientoTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.TipoMovimientoTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumTipoMovimientoTorreonNullableFilter<$PrismaModel>
  }

  export type NestedEnumEstadoMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoMovimientoTorreon | EnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoMovimientoTorreon[] | ListEnumEstadoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoMovimientoTorreonFilter<$PrismaModel>
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

  export type NestedEnumPosicionChimeneaTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionChimeneaTorreon | EnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionChimeneaTorreon[] | ListEnumPosicionChimeneaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionChimeneaTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.PosicionChimeneaTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumPosicionChimeneaTorreonNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumDireccionEmpujeTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DireccionEmpujeTorreon | EnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DireccionEmpujeTorreon[] | ListEnumDireccionEmpujeTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDireccionEmpujeTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.DireccionEmpujeTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumDireccionEmpujeTorreonNullableFilter<$PrismaModel>
  }

  export type NestedEnumPosicionCabinaTorreonNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PosicionCabinaTorreon | EnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    in?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PosicionCabinaTorreon[] | ListEnumPosicionCabinaTorreonFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPosicionCabinaTorreonNullableWithAggregatesFilter<$PrismaModel> | $Enums.PosicionCabinaTorreon | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel>
    _max?: NestedEnumPosicionCabinaTorreonNullableFilter<$PrismaModel>
  }

  export type NestedEnumEstadoRondaTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaTorreon | EnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel> | $Enums.EstadoRondaTorreon
  }

  export type NestedEnumEstadoRondaTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaTorreon | EnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaTorreon[] | ListEnumEstadoRondaTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaTorreonFilter<$PrismaModel>
  }

  export type NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaMovimientoTorreon | EnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel> | $Enums.EstadoRondaMovimientoTorreon
  }

  export type NestedEnumEstadoRondaMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoRondaMovimientoTorreon | EnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoRondaMovimientoTorreon[] | ListEnumEstadoRondaMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoRondaMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoRondaMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoRondaMovimientoTorreonFilter<$PrismaModel>
  }

  export type NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTorreon | EnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel> | $Enums.EstadoIncidenteTorreon
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

  export type NestedEnumEstadoIncidenteTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoIncidenteTorreon | EnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoIncidenteTorreon[] | ListEnumEstadoIncidenteTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoIncidenteTorreonWithAggregatesFilter<$PrismaModel> | $Enums.EstadoIncidenteTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel>
    _max?: NestedEnumEstadoIncidenteTorreonFilter<$PrismaModel>
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

  export type NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFotoMovimientoTorreon | EnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel> | $Enums.TipoFotoMovimientoTorreon
  }

  export type NestedEnumTipoFotoMovimientoTorreonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoFotoMovimientoTorreon | EnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    in?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    notIn?: $Enums.TipoFotoMovimientoTorreon[] | ListEnumTipoFotoMovimientoTorreonFieldRefInput<$PrismaModel>
    not?: NestedEnumTipoFotoMovimientoTorreonWithAggregatesFilter<$PrismaModel> | $Enums.TipoFotoMovimientoTorreon
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel>
    _max?: NestedEnumTipoFotoMovimientoTorreonFilter<$PrismaModel>
  }

  export type RondaTorreonMovimientoCreateWithoutMovimientoInput = {
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ronda: RondaTorreonCreateNestedOneWithoutMovimientosInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroCreateNestedOneWithoutRondasBloqueadasInput
  }

  export type RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput = {
    id?: number
    rondaId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoCreateOrConnectWithoutMovimientoInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    create: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput>
  }

  export type RondaTorreonMovimientoCreateManyMovimientoInputEnvelope = {
    data: RondaTorreonMovimientoCreateManyMovimientoInput | RondaTorreonMovimientoCreateManyMovimientoInput[]
    skipDuplicates?: boolean
  }

  export type IncidenteTorreonFerroCreateWithoutMovimientoInput = {
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondasBloqueadas?: RondaTorreonMovimientoCreateNestedManyWithoutBloqueadoPorIncidenteInput
    fotos?: IncidenteTorreonFotoCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput = {
    id?: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutBloqueadoPorIncidenteInput
    fotos?: IncidenteTorreonFotoUncheckedCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroCreateOrConnectWithoutMovimientoInput = {
    where: IncidenteTorreonFerroWhereUniqueInput
    create: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput>
  }

  export type IncidenteTorreonFerroCreateManyMovimientoInputEnvelope = {
    data: IncidenteTorreonFerroCreateManyMovimientoInput | IncidenteTorreonFerroCreateManyMovimientoInput[]
    skipDuplicates?: boolean
  }

  export type MovimientoTorreonFotoCreateWithoutMovimientoInput = {
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput = {
    id?: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFotoCreateOrConnectWithoutMovimientoInput = {
    where: MovimientoTorreonFotoWhereUniqueInput
    create: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput>
  }

  export type MovimientoTorreonFotoCreateManyMovimientoInputEnvelope = {
    data: MovimientoTorreonFotoCreateManyMovimientoInput | MovimientoTorreonFotoCreateManyMovimientoInput[]
    skipDuplicates?: boolean
  }

  export type RondaTorreonMovimientoUpsertWithWhereUniqueWithoutMovimientoInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    update: XOR<RondaTorreonMovimientoUpdateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedUpdateWithoutMovimientoInput>
    create: XOR<RondaTorreonMovimientoCreateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedCreateWithoutMovimientoInput>
  }

  export type RondaTorreonMovimientoUpdateWithWhereUniqueWithoutMovimientoInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    data: XOR<RondaTorreonMovimientoUpdateWithoutMovimientoInput, RondaTorreonMovimientoUncheckedUpdateWithoutMovimientoInput>
  }

  export type RondaTorreonMovimientoUpdateManyWithWhereWithoutMovimientoInput = {
    where: RondaTorreonMovimientoScalarWhereInput
    data: XOR<RondaTorreonMovimientoUpdateManyMutationInput, RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoInput>
  }

  export type RondaTorreonMovimientoScalarWhereInput = {
    AND?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
    OR?: RondaTorreonMovimientoScalarWhereInput[]
    NOT?: RondaTorreonMovimientoScalarWhereInput | RondaTorreonMovimientoScalarWhereInput[]
    id?: IntFilter<"RondaTorreonMovimiento"> | number
    rondaId?: IntFilter<"RondaTorreonMovimiento"> | number
    movimientoId?: IntFilter<"RondaTorreonMovimiento"> | number
    bloqueadoPorIncidenteId?: IntNullableFilter<"RondaTorreonMovimiento"> | number | null
    empresaId?: IntFilter<"RondaTorreonMovimiento"> | number
    orden?: IntFilter<"RondaTorreonMovimiento"> | number
    prioridad?: EnumPrioridadTorreonFilter<"RondaTorreonMovimiento"> | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFilter<"RondaTorreonMovimiento"> | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    fechaInicio?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    fechaFin?: DateTimeNullableFilter<"RondaTorreonMovimiento"> | Date | string | null
    createdAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
    updatedAt?: DateTimeFilter<"RondaTorreonMovimiento"> | Date | string
  }

  export type IncidenteTorreonFerroUpsertWithWhereUniqueWithoutMovimientoInput = {
    where: IncidenteTorreonFerroWhereUniqueInput
    update: XOR<IncidenteTorreonFerroUpdateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedUpdateWithoutMovimientoInput>
    create: XOR<IncidenteTorreonFerroCreateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedCreateWithoutMovimientoInput>
  }

  export type IncidenteTorreonFerroUpdateWithWhereUniqueWithoutMovimientoInput = {
    where: IncidenteTorreonFerroWhereUniqueInput
    data: XOR<IncidenteTorreonFerroUpdateWithoutMovimientoInput, IncidenteTorreonFerroUncheckedUpdateWithoutMovimientoInput>
  }

  export type IncidenteTorreonFerroUpdateManyWithWhereWithoutMovimientoInput = {
    where: IncidenteTorreonFerroScalarWhereInput
    data: XOR<IncidenteTorreonFerroUpdateManyMutationInput, IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoInput>
  }

  export type IncidenteTorreonFerroScalarWhereInput = {
    AND?: IncidenteTorreonFerroScalarWhereInput | IncidenteTorreonFerroScalarWhereInput[]
    OR?: IncidenteTorreonFerroScalarWhereInput[]
    NOT?: IncidenteTorreonFerroScalarWhereInput | IncidenteTorreonFerroScalarWhereInput[]
    id?: IntFilter<"IncidenteTorreonFerro"> | number
    movimientoId?: IntFilter<"IncidenteTorreonFerro"> | number
    creadoPorId?: IntFilter<"IncidenteTorreonFerro"> | number
    resueltoPorId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    estado?: EnumEstadoIncidenteTorreonFilter<"IncidenteTorreonFerro"> | $Enums.EstadoIncidenteTorreon
    motivo?: StringFilter<"IncidenteTorreonFerro"> | string
    solucion?: StringNullableFilter<"IncidenteTorreonFerro"> | string | null
    localidadId?: IntFilter<"IncidenteTorreonFerro"> | number
    viaBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    seccionBloqueadaId?: IntNullableFilter<"IncidenteTorreonFerro"> | number | null
    fechaInicio?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    fechaResolucion?: DateTimeNullableFilter<"IncidenteTorreonFerro"> | Date | string | null
    createdAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFerro"> | Date | string
  }

  export type MovimientoTorreonFotoUpsertWithWhereUniqueWithoutMovimientoInput = {
    where: MovimientoTorreonFotoWhereUniqueInput
    update: XOR<MovimientoTorreonFotoUpdateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedUpdateWithoutMovimientoInput>
    create: XOR<MovimientoTorreonFotoCreateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedCreateWithoutMovimientoInput>
  }

  export type MovimientoTorreonFotoUpdateWithWhereUniqueWithoutMovimientoInput = {
    where: MovimientoTorreonFotoWhereUniqueInput
    data: XOR<MovimientoTorreonFotoUpdateWithoutMovimientoInput, MovimientoTorreonFotoUncheckedUpdateWithoutMovimientoInput>
  }

  export type MovimientoTorreonFotoUpdateManyWithWhereWithoutMovimientoInput = {
    where: MovimientoTorreonFotoScalarWhereInput
    data: XOR<MovimientoTorreonFotoUpdateManyMutationInput, MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoInput>
  }

  export type MovimientoTorreonFotoScalarWhereInput = {
    AND?: MovimientoTorreonFotoScalarWhereInput | MovimientoTorreonFotoScalarWhereInput[]
    OR?: MovimientoTorreonFotoScalarWhereInput[]
    NOT?: MovimientoTorreonFotoScalarWhereInput | MovimientoTorreonFotoScalarWhereInput[]
    id?: IntFilter<"MovimientoTorreonFoto"> | number
    movimientoId?: IntFilter<"MovimientoTorreonFoto"> | number
    tipo?: EnumTipoFotoMovimientoTorreonFilter<"MovimientoTorreonFoto"> | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFilter<"MovimientoTorreonFoto"> | number
    url?: StringFilter<"MovimientoTorreonFoto"> | string
    storageKey?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"MovimientoTorreonFoto"> | number
    comentario?: StringNullableFilter<"MovimientoTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"MovimientoTorreonFoto"> | Date | string
  }

  export type RondaTorreonMovimientoCreateWithoutRondaInput = {
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutRondasInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroCreateNestedOneWithoutRondasBloqueadasInput
  }

  export type RondaTorreonMovimientoUncheckedCreateWithoutRondaInput = {
    id?: number
    movimientoId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoCreateOrConnectWithoutRondaInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    create: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput>
  }

  export type RondaTorreonMovimientoCreateManyRondaInputEnvelope = {
    data: RondaTorreonMovimientoCreateManyRondaInput | RondaTorreonMovimientoCreateManyRondaInput[]
    skipDuplicates?: boolean
  }

  export type RondaTorreonMovimientoUpsertWithWhereUniqueWithoutRondaInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    update: XOR<RondaTorreonMovimientoUpdateWithoutRondaInput, RondaTorreonMovimientoUncheckedUpdateWithoutRondaInput>
    create: XOR<RondaTorreonMovimientoCreateWithoutRondaInput, RondaTorreonMovimientoUncheckedCreateWithoutRondaInput>
  }

  export type RondaTorreonMovimientoUpdateWithWhereUniqueWithoutRondaInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    data: XOR<RondaTorreonMovimientoUpdateWithoutRondaInput, RondaTorreonMovimientoUncheckedUpdateWithoutRondaInput>
  }

  export type RondaTorreonMovimientoUpdateManyWithWhereWithoutRondaInput = {
    where: RondaTorreonMovimientoScalarWhereInput
    data: XOR<RondaTorreonMovimientoUpdateManyMutationInput, RondaTorreonMovimientoUncheckedUpdateManyWithoutRondaInput>
  }

  export type RondaTorreonCreateWithoutMovimientosInput = {
    localidadId: number
    numeroRonda: number
    estado?: $Enums.EstadoRondaTorreon
    fechaApertura?: Date | string
    fechaCierre?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonUncheckedCreateWithoutMovimientosInput = {
    id?: number
    localidadId: number
    numeroRonda: number
    estado?: $Enums.EstadoRondaTorreon
    fechaApertura?: Date | string
    fechaCierre?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonCreateOrConnectWithoutMovimientosInput = {
    where: RondaTorreonWhereUniqueInput
    create: XOR<RondaTorreonCreateWithoutMovimientosInput, RondaTorreonUncheckedCreateWithoutMovimientosInput>
  }

  export type MovimientoTorreonFerroCreateWithoutRondasInput = {
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    incidentes?: IncidenteTorreonFerroCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroUncheckedCreateWithoutRondasInput = {
    id?: number
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    incidentes?: IncidenteTorreonFerroUncheckedCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoUncheckedCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroCreateOrConnectWithoutRondasInput = {
    where: MovimientoTorreonFerroWhereUniqueInput
    create: XOR<MovimientoTorreonFerroCreateWithoutRondasInput, MovimientoTorreonFerroUncheckedCreateWithoutRondasInput>
  }

  export type IncidenteTorreonFerroCreateWithoutRondasBloqueadasInput = {
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutIncidentesInput
    fotos?: IncidenteTorreonFotoCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroUncheckedCreateWithoutRondasBloqueadasInput = {
    id?: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fotos?: IncidenteTorreonFotoUncheckedCreateNestedManyWithoutIncidenteInput
  }

  export type IncidenteTorreonFerroCreateOrConnectWithoutRondasBloqueadasInput = {
    where: IncidenteTorreonFerroWhereUniqueInput
    create: XOR<IncidenteTorreonFerroCreateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedCreateWithoutRondasBloqueadasInput>
  }

  export type RondaTorreonUpsertWithoutMovimientosInput = {
    update: XOR<RondaTorreonUpdateWithoutMovimientosInput, RondaTorreonUncheckedUpdateWithoutMovimientosInput>
    create: XOR<RondaTorreonCreateWithoutMovimientosInput, RondaTorreonUncheckedCreateWithoutMovimientosInput>
    where?: RondaTorreonWhereInput
  }

  export type RondaTorreonUpdateToOneWithWhereWithoutMovimientosInput = {
    where?: RondaTorreonWhereInput
    data: XOR<RondaTorreonUpdateWithoutMovimientosInput, RondaTorreonUncheckedUpdateWithoutMovimientosInput>
  }

  export type RondaTorreonUpdateWithoutMovimientosInput = {
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonUncheckedUpdateWithoutMovimientosInput = {
    id?: IntFieldUpdateOperationsInput | number
    localidadId?: IntFieldUpdateOperationsInput | number
    numeroRonda?: IntFieldUpdateOperationsInput | number
    estado?: EnumEstadoRondaTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaTorreon
    fechaApertura?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaCierre?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFerroUpsertWithoutRondasInput = {
    update: XOR<MovimientoTorreonFerroUpdateWithoutRondasInput, MovimientoTorreonFerroUncheckedUpdateWithoutRondasInput>
    create: XOR<MovimientoTorreonFerroCreateWithoutRondasInput, MovimientoTorreonFerroUncheckedCreateWithoutRondasInput>
    where?: MovimientoTorreonFerroWhereInput
  }

  export type MovimientoTorreonFerroUpdateToOneWithWhereWithoutRondasInput = {
    where?: MovimientoTorreonFerroWhereInput
    data: XOR<MovimientoTorreonFerroUpdateWithoutRondasInput, MovimientoTorreonFerroUncheckedUpdateWithoutRondasInput>
  }

  export type MovimientoTorreonFerroUpdateWithoutRondasInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    incidentes?: IncidenteTorreonFerroUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUpdateManyWithoutMovimientoNestedInput
  }

  export type MovimientoTorreonFerroUncheckedUpdateWithoutRondasInput = {
    id?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    incidentes?: IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoNestedInput
  }

  export type IncidenteTorreonFerroUpsertWithoutRondasBloqueadasInput = {
    update: XOR<IncidenteTorreonFerroUpdateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedUpdateWithoutRondasBloqueadasInput>
    create: XOR<IncidenteTorreonFerroCreateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedCreateWithoutRondasBloqueadasInput>
    where?: IncidenteTorreonFerroWhereInput
  }

  export type IncidenteTorreonFerroUpdateToOneWithWhereWithoutRondasBloqueadasInput = {
    where?: IncidenteTorreonFerroWhereInput
    data: XOR<IncidenteTorreonFerroUpdateWithoutRondasBloqueadasInput, IncidenteTorreonFerroUncheckedUpdateWithoutRondasBloqueadasInput>
  }

  export type IncidenteTorreonFerroUpdateWithoutRondasBloqueadasInput = {
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutIncidentesNestedInput
    fotos?: IncidenteTorreonFotoUpdateManyWithoutIncidenteNestedInput
  }

  export type IncidenteTorreonFerroUncheckedUpdateWithoutRondasBloqueadasInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fotos?: IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteNestedInput
  }

  export type MovimientoTorreonFerroCreateWithoutIncidentesInput = {
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroUncheckedCreateWithoutIncidentesInput = {
    id?: number
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutMovimientoInput
    fotos?: MovimientoTorreonFotoUncheckedCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroCreateOrConnectWithoutIncidentesInput = {
    where: MovimientoTorreonFerroWhereUniqueInput
    create: XOR<MovimientoTorreonFerroCreateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedCreateWithoutIncidentesInput>
  }

  export type RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput = {
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    ronda: RondaTorreonCreateNestedOneWithoutMovimientosInput
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutRondasInput
  }

  export type RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput = {
    id?: number
    rondaId: number
    movimientoId: number
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoCreateOrConnectWithoutBloqueadoPorIncidenteInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    create: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput>
  }

  export type RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInputEnvelope = {
    data: RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInput | RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInput[]
    skipDuplicates?: boolean
  }

  export type IncidenteTorreonFotoCreateWithoutIncidenteInput = {
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput = {
    id?: number
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFotoCreateOrConnectWithoutIncidenteInput = {
    where: IncidenteTorreonFotoWhereUniqueInput
    create: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput>
  }

  export type IncidenteTorreonFotoCreateManyIncidenteInputEnvelope = {
    data: IncidenteTorreonFotoCreateManyIncidenteInput | IncidenteTorreonFotoCreateManyIncidenteInput[]
    skipDuplicates?: boolean
  }

  export type MovimientoTorreonFerroUpsertWithoutIncidentesInput = {
    update: XOR<MovimientoTorreonFerroUpdateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedUpdateWithoutIncidentesInput>
    create: XOR<MovimientoTorreonFerroCreateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedCreateWithoutIncidentesInput>
    where?: MovimientoTorreonFerroWhereInput
  }

  export type MovimientoTorreonFerroUpdateToOneWithWhereWithoutIncidentesInput = {
    where?: MovimientoTorreonFerroWhereInput
    data: XOR<MovimientoTorreonFerroUpdateWithoutIncidentesInput, MovimientoTorreonFerroUncheckedUpdateWithoutIncidentesInput>
  }

  export type MovimientoTorreonFerroUpdateWithoutIncidentesInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUpdateManyWithoutMovimientoNestedInput
  }

  export type MovimientoTorreonFerroUncheckedUpdateWithoutIncidentesInput = {
    id?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoNestedInput
    fotos?: MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoNestedInput
  }

  export type RondaTorreonMovimientoUpsertWithWhereUniqueWithoutBloqueadoPorIncidenteInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    update: XOR<RondaTorreonMovimientoUpdateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedUpdateWithoutBloqueadoPorIncidenteInput>
    create: XOR<RondaTorreonMovimientoCreateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedCreateWithoutBloqueadoPorIncidenteInput>
  }

  export type RondaTorreonMovimientoUpdateWithWhereUniqueWithoutBloqueadoPorIncidenteInput = {
    where: RondaTorreonMovimientoWhereUniqueInput
    data: XOR<RondaTorreonMovimientoUpdateWithoutBloqueadoPorIncidenteInput, RondaTorreonMovimientoUncheckedUpdateWithoutBloqueadoPorIncidenteInput>
  }

  export type RondaTorreonMovimientoUpdateManyWithWhereWithoutBloqueadoPorIncidenteInput = {
    where: RondaTorreonMovimientoScalarWhereInput
    data: XOR<RondaTorreonMovimientoUpdateManyMutationInput, RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteInput>
  }

  export type IncidenteTorreonFotoUpsertWithWhereUniqueWithoutIncidenteInput = {
    where: IncidenteTorreonFotoWhereUniqueInput
    update: XOR<IncidenteTorreonFotoUpdateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedUpdateWithoutIncidenteInput>
    create: XOR<IncidenteTorreonFotoCreateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedCreateWithoutIncidenteInput>
  }

  export type IncidenteTorreonFotoUpdateWithWhereUniqueWithoutIncidenteInput = {
    where: IncidenteTorreonFotoWhereUniqueInput
    data: XOR<IncidenteTorreonFotoUpdateWithoutIncidenteInput, IncidenteTorreonFotoUncheckedUpdateWithoutIncidenteInput>
  }

  export type IncidenteTorreonFotoUpdateManyWithWhereWithoutIncidenteInput = {
    where: IncidenteTorreonFotoScalarWhereInput
    data: XOR<IncidenteTorreonFotoUpdateManyMutationInput, IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteInput>
  }

  export type IncidenteTorreonFotoScalarWhereInput = {
    AND?: IncidenteTorreonFotoScalarWhereInput | IncidenteTorreonFotoScalarWhereInput[]
    OR?: IncidenteTorreonFotoScalarWhereInput[]
    NOT?: IncidenteTorreonFotoScalarWhereInput | IncidenteTorreonFotoScalarWhereInput[]
    id?: IntFilter<"IncidenteTorreonFoto"> | number
    incidenteId?: IntFilter<"IncidenteTorreonFoto"> | number
    orden?: IntFilter<"IncidenteTorreonFoto"> | number
    url?: StringFilter<"IncidenteTorreonFoto"> | string
    storageKey?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaPorId?: IntFilter<"IncidenteTorreonFoto"> | number
    comentario?: StringNullableFilter<"IncidenteTorreonFoto"> | string | null
    tomadaAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    createdAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
    updatedAt?: DateTimeFilter<"IncidenteTorreonFoto"> | Date | string
  }

  export type MovimientoTorreonFerroCreateWithoutFotosInput = {
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoCreateNestedManyWithoutMovimientoInput
    incidentes?: IncidenteTorreonFerroCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroUncheckedCreateWithoutFotosInput = {
    id?: number
    empresaId: number
    creadoPorId: number
    clienteId?: number | null
    supervisorId?: number | null
    coordinadorId?: number | null
    operadorId?: number | null
    localidadId: number
    viaOrigenId?: number | null
    viaDestinoId?: number | null
    seccionOrigenId?: number | null
    seccionDestinoId?: number | null
    locomotiveNumber: number
    prioridad?: $Enums.PrioridadTorreon
    tipoMovimiento?: $Enums.TipoMovimientoTorreon | null
    estado?: $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    fechaPausa?: Date | string | null
    instrucciones?: string | null
    posicionChimenea?: $Enums.PosicionChimeneaTorreon | null
    finalizado?: boolean
    direccionEmpuje?: $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: string | null
    localidadNombreSnapshot?: string | null
    viaOrigenNombreSnapshot?: string | null
    viaDestinoNombreSnapshot?: string | null
    seccionOrigenNombreSnapshot?: string | null
    seccionDestinoNombreSnapshot?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutMovimientoInput
    incidentes?: IncidenteTorreonFerroUncheckedCreateNestedManyWithoutMovimientoInput
  }

  export type MovimientoTorreonFerroCreateOrConnectWithoutFotosInput = {
    where: MovimientoTorreonFerroWhereUniqueInput
    create: XOR<MovimientoTorreonFerroCreateWithoutFotosInput, MovimientoTorreonFerroUncheckedCreateWithoutFotosInput>
  }

  export type MovimientoTorreonFerroUpsertWithoutFotosInput = {
    update: XOR<MovimientoTorreonFerroUpdateWithoutFotosInput, MovimientoTorreonFerroUncheckedUpdateWithoutFotosInput>
    create: XOR<MovimientoTorreonFerroCreateWithoutFotosInput, MovimientoTorreonFerroUncheckedCreateWithoutFotosInput>
    where?: MovimientoTorreonFerroWhereInput
  }

  export type MovimientoTorreonFerroUpdateToOneWithWhereWithoutFotosInput = {
    where?: MovimientoTorreonFerroWhereInput
    data: XOR<MovimientoTorreonFerroUpdateWithoutFotosInput, MovimientoTorreonFerroUncheckedUpdateWithoutFotosInput>
  }

  export type MovimientoTorreonFerroUpdateWithoutFotosInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUpdateManyWithoutMovimientoNestedInput
    incidentes?: IncidenteTorreonFerroUpdateManyWithoutMovimientoNestedInput
  }

  export type MovimientoTorreonFerroUncheckedUpdateWithoutFotosInput = {
    id?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    supervisorId?: NullableIntFieldUpdateOperationsInput | number | null
    coordinadorId?: NullableIntFieldUpdateOperationsInput | number | null
    operadorId?: NullableIntFieldUpdateOperationsInput | number | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    viaDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionOrigenId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionDestinoId?: NullableIntFieldUpdateOperationsInput | number | null
    locomotiveNumber?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    tipoMovimiento?: NullableEnumTipoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoMovimientoTorreon | null
    estado?: EnumEstadoMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoMovimientoTorreon
    fechaSolicitud?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaPausa?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instrucciones?: NullableStringFieldUpdateOperationsInput | string | null
    posicionChimenea?: NullableEnumPosicionChimeneaTorreonFieldUpdateOperationsInput | $Enums.PosicionChimeneaTorreon | null
    finalizado?: BoolFieldUpdateOperationsInput | boolean
    direccionEmpuje?: NullableEnumDireccionEmpujeTorreonFieldUpdateOperationsInput | $Enums.DireccionEmpujeTorreon | null
    posicionCabina?: NullableEnumPosicionCabinaTorreonFieldUpdateOperationsInput | $Enums.PosicionCabinaTorreon | null
    empresaNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    localidadNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    viaDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionOrigenNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    seccionDestinoNombreSnapshot?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoNestedInput
    incidentes?: IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoNestedInput
  }

  export type IncidenteTorreonFerroCreateWithoutFotosInput = {
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    movimiento: MovimientoTorreonFerroCreateNestedOneWithoutIncidentesInput
    rondasBloqueadas?: RondaTorreonMovimientoCreateNestedManyWithoutBloqueadoPorIncidenteInput
  }

  export type IncidenteTorreonFerroUncheckedCreateWithoutFotosInput = {
    id?: number
    movimientoId: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedCreateNestedManyWithoutBloqueadoPorIncidenteInput
  }

  export type IncidenteTorreonFerroCreateOrConnectWithoutFotosInput = {
    where: IncidenteTorreonFerroWhereUniqueInput
    create: XOR<IncidenteTorreonFerroCreateWithoutFotosInput, IncidenteTorreonFerroUncheckedCreateWithoutFotosInput>
  }

  export type IncidenteTorreonFerroUpsertWithoutFotosInput = {
    update: XOR<IncidenteTorreonFerroUpdateWithoutFotosInput, IncidenteTorreonFerroUncheckedUpdateWithoutFotosInput>
    create: XOR<IncidenteTorreonFerroCreateWithoutFotosInput, IncidenteTorreonFerroUncheckedCreateWithoutFotosInput>
    where?: IncidenteTorreonFerroWhereInput
  }

  export type IncidenteTorreonFerroUpdateToOneWithWhereWithoutFotosInput = {
    where?: IncidenteTorreonFerroWhereInput
    data: XOR<IncidenteTorreonFerroUpdateWithoutFotosInput, IncidenteTorreonFerroUncheckedUpdateWithoutFotosInput>
  }

  export type IncidenteTorreonFerroUpdateWithoutFotosInput = {
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutIncidentesNestedInput
    rondasBloqueadas?: RondaTorreonMovimientoUpdateManyWithoutBloqueadoPorIncidenteNestedInput
  }

  export type IncidenteTorreonFerroUncheckedUpdateWithoutFotosInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteNestedInput
  }

  export type RondaTorreonMovimientoCreateManyMovimientoInput = {
    id?: number
    rondaId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFerroCreateManyMovimientoInput = {
    id?: number
    creadoPorId: number
    resueltoPorId?: number | null
    estado?: $Enums.EstadoIncidenteTorreon
    motivo: string
    solucion?: string | null
    localidadId: number
    viaBloqueadaId?: number | null
    seccionBloqueadaId?: number | null
    fechaInicio?: Date | string
    fechaResolucion?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MovimientoTorreonFotoCreateManyMovimientoInput = {
    id?: number
    tipo: $Enums.TipoFotoMovimientoTorreon
    orden?: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoUpdateWithoutMovimientoInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ronda?: RondaTorreonUpdateOneRequiredWithoutMovimientosNestedInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroUpdateOneWithoutRondasBloqueadasNestedInput
  }

  export type RondaTorreonMovimientoUncheckedUpdateWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFerroUpdateWithoutMovimientoInput = {
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUpdateManyWithoutBloqueadoPorIncidenteNestedInput
    fotos?: IncidenteTorreonFotoUpdateManyWithoutIncidenteNestedInput
  }

  export type IncidenteTorreonFerroUncheckedUpdateWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rondasBloqueadas?: RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteNestedInput
    fotos?: IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteNestedInput
  }

  export type IncidenteTorreonFerroUncheckedUpdateManyWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    creadoPorId?: IntFieldUpdateOperationsInput | number
    resueltoPorId?: NullableIntFieldUpdateOperationsInput | number | null
    estado?: EnumEstadoIncidenteTorreonFieldUpdateOperationsInput | $Enums.EstadoIncidenteTorreon
    motivo?: StringFieldUpdateOperationsInput | string
    solucion?: NullableStringFieldUpdateOperationsInput | string | null
    localidadId?: IntFieldUpdateOperationsInput | number
    viaBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    seccionBloqueadaId?: NullableIntFieldUpdateOperationsInput | number | null
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaResolucion?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoUpdateWithoutMovimientoInput = {
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoUncheckedUpdateWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MovimientoTorreonFotoUncheckedUpdateManyWithoutMovimientoInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipo?: EnumTipoFotoMovimientoTorreonFieldUpdateOperationsInput | $Enums.TipoFotoMovimientoTorreon
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoCreateManyRondaInput = {
    id?: number
    movimientoId: number
    bloqueadoPorIncidenteId?: number | null
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoUpdateWithoutRondaInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutRondasNestedInput
    bloqueadoPorIncidente?: IncidenteTorreonFerroUpdateOneWithoutRondasBloqueadasNestedInput
  }

  export type RondaTorreonMovimientoUncheckedUpdateWithoutRondaInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutRondaInput = {
    id?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    bloqueadoPorIncidenteId?: NullableIntFieldUpdateOperationsInput | number | null
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoCreateManyBloqueadoPorIncidenteInput = {
    id?: number
    rondaId: number
    movimientoId: number
    empresaId: number
    orden: number
    prioridad?: $Enums.PrioridadTorreon
    estado?: $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: Date | string
    fechaInicio?: Date | string | null
    fechaFin?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type IncidenteTorreonFotoCreateManyIncidenteInput = {
    id?: number
    orden: number
    url: string
    storageKey?: string | null
    tomadaPorId: number
    comentario?: string | null
    tomadaAt?: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RondaTorreonMovimientoUpdateWithoutBloqueadoPorIncidenteInput = {
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ronda?: RondaTorreonUpdateOneRequiredWithoutMovimientosNestedInput
    movimiento?: MovimientoTorreonFerroUpdateOneRequiredWithoutRondasNestedInput
  }

  export type RondaTorreonMovimientoUncheckedUpdateWithoutBloqueadoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RondaTorreonMovimientoUncheckedUpdateManyWithoutBloqueadoPorIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    rondaId?: IntFieldUpdateOperationsInput | number
    movimientoId?: IntFieldUpdateOperationsInput | number
    empresaId?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    prioridad?: EnumPrioridadTorreonFieldUpdateOperationsInput | $Enums.PrioridadTorreon
    estado?: EnumEstadoRondaMovimientoTorreonFieldUpdateOperationsInput | $Enums.EstadoRondaMovimientoTorreon
    fechaAsignado?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaInicio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fechaFin?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoUpdateWithoutIncidenteInput = {
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoUncheckedUpdateWithoutIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IncidenteTorreonFotoUncheckedUpdateManyWithoutIncidenteInput = {
    id?: IntFieldUpdateOperationsInput | number
    orden?: IntFieldUpdateOperationsInput | number
    url?: StringFieldUpdateOperationsInput | string
    storageKey?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaPorId?: IntFieldUpdateOperationsInput | number
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    tomadaAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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