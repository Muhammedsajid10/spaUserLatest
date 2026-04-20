/**
 * @file Home.jsx
 * @description The Home page component.
 *
 * Responsibilities:
 *  - Layout composition (uses components and hooks, no business logic owned here)
 *  - Displays a welcome banner using auth context
 *  - Demonstrates useFetch by loading popular services
 *  - Shows loading/error/empty states
 *  - Links through to the booking flow
 *
 * This page is intentionally simple — it exists to demonstrate the
 * architecture pattern (page → hooks → components → services).
 */

import React from 'react';
import { Link } from 'react-router-dom';

// Architecture-conformant imports from new barrel paths
import { useAuth }     from '../../hooks';
import { useFetch }    from '../../hooks';
import Button          from '../../components/Button';
import { ROUTES, formatCurrency, formatDuration } from '../../utils';
import { API_BASE_URL } from '../../utils/constants';

import styles from './Home.module.css';

// ---------------------------------------------------------------------------
// Sub-components (private to this page, not exported)
// ---------------------------------------------------------------------------

/**
 * ServiceCard — renders a single spa service preview card.
 * No business logic — pure presentational component.
 */
const ServiceCard = ({ service }) => {
  const { name, description, price, duration, category } = service;

  return (
    <article className={styles.serviceCard}>
      {/* Category badge */}
      {category && (
        <span className={styles.serviceCard__badge}>{category}</span>
      )}

      <h3 className={styles.serviceCard__name}>{name}</h3>

      {description && (
        <p className={styles.serviceCard__description}>
          {description.length > 100
            ? `${description.slice(0, 97)}...`
            : description}
        </p>
      )}

      <div className={styles.serviceCard__meta}>
        {/* Duration */}
        {duration != null && (
          <span className={styles.serviceCard__duration}>
            ⏱ {formatDuration(duration)}
          </span>
        )}

        {/* Price */}
        {price != null && (
          <span className={styles.serviceCard__price}>
            {formatCurrency(price)}
          </span>
        )}
      </div>

      <Link to={ROUTES.SERVICES} className={styles.serviceCard__cta}>
        Book Now →
      </Link>
    </article>
  );
};

/**
 * LoadingSkeleton — placeholder cards shown while data is fetching.
 */
const LoadingSkeleton = () => (
  <div className={styles.skeletonGrid}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={styles.skeleton} aria-hidden="true">
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--badge']}`} />
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--title']}`} />
        <div className={styles.skeleton__line} />
        <div className={`${styles.skeleton__line} ${styles['skeleton__line--short']}`} />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

const Home = () => {
  // Auth context — to personalise the greeting
  const { user, isAuthenticated } = useAuth();

  // Fetch popular services from the API to demonstrate useFetch
  const {
    data,
    loading,
    error,
    refetch,
  } = useFetch(`${API_BASE_URL}/services/popular`);

  // Derive services list from API response shape
  const services = data?.data?.services || data?.services || data || [];

  return (
    <main className={styles.home} id="main-content">

      {/* ------------------------------------------------------------------ */}
      {/* Hero Banner                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className={styles.hero} aria-label="Welcome banner">
        <div className={styles.hero__content}>
          <p className={styles.hero__eyebrow}>Welcome to</p>
          <h1 className={styles.hero__title}>Allora Spa</h1>
          <p className={styles.hero__subtitle}>
            {isAuthenticated && user?.name
              ? `Good to see you back, ${user.name.split(' ')[0]}. Ready for your next treatment?`
              : 'Indulge in a world of luxury — discover our premium spa treatments.'}
          </p>

          <div className={styles.hero__actions}>
            <Link to={ROUTES.SERVICES}>
              <Button variant="primary" size="lg">
                Explore Services
              </Button>
            </Link>

            {!isAuthenticated && (
              <Link to={ROUTES.LOGIN}>
                <Button variant="secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Decorative background gradient orbs */}
        <div className={styles.hero__orb1} aria-hidden="true" />
        <div className={styles.hero__orb2} aria-hidden="true" />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Popular Services Section                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className={styles.services} aria-label="Popular services">
        <header className={styles.services__header}>
          <h2 className={styles.services__title}>Popular Treatments</h2>
          <p className={styles.services__subtitle}>
            Our most-loved services, curated for the ultimate spa experience.
          </p>
        </header>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Error state */}
        {error && !loading && (
          <div className={styles.errorState} role="alert">
            <p className={styles.errorState__message}>
              Unable to load services at this time.
            </p>
            <Button variant="ghost" onClick={refetch} size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && services.length === 0 && (
          <p className={styles.emptyState}>No services available right now.</p>
        )}

        {/* Services grid */}
        {!loading && !error && services.length > 0 && (
          <div className={styles.serviceGrid}>
            {services.slice(0, 6).map((service) => (
              <ServiceCard key={service._id || service.id} service={service} />
            ))}
          </div>
        )}

        {/* View All CTA */}
        {!loading && services.length > 0 && (
          <div className={styles.services__cta}>
            <Link to={ROUTES.SERVICES}>
              <Button variant="secondary">View All Services</Button>
            </Link>
          </div>
        )}
      </section>

    </main>
  );
};

export default Home;
