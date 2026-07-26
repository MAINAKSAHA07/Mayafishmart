"use client";

import { useEffect, useId, useRef } from "react";
import * as d3 from "d3";
import { formatInr } from "@mayafishmart/shared/money";
import type { DayPoint, ProductPoint, SlicePoint } from "@/lib/sales-aggregates";

function useReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RevenueTrendChart({ series }: { series: DayPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 640;
    const height = 220;
    const margin = { top: 16, right: 16, bottom: 32, left: 52 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(series.map((d) => d.date))
      .range([0, innerW])
      .padding(0.2);

    const yMax = d3.max(series, (d) => d.revenuePaise) || 1;
    const y = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([innerH, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(series.filter((_, i) => i % Math.ceil(series.length / 6) === 0).map((d) => d.date))
          .tickFormat((d) => series.find((s) => s.date === d)?.label ?? String(d))
      )
      .call((sel) => sel.select(".domain").attr("stroke", "rgba(255,255,255,0.2)"))
      .call((sel) => sel.selectAll("text").attr("fill", "rgba(244,248,255,0.55)").attr("font-size", 10))
      .call((sel) => sel.selectAll("line").attr("stroke", "rgba(255,255,255,0.12)"));

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => `₹${Math.round(Number(d) / 100)}`)
      )
      .call((sel) => sel.select(".domain").attr("stroke", "rgba(255,255,255,0.2)"))
      .call((sel) => sel.selectAll("text").attr("fill", "rgba(244,248,255,0.55)").attr("font-size", 10))
      .call((sel) => sel.selectAll("line").attr("stroke", "rgba(255,255,255,0.12)"));

    const area = d3
      .area<DayPoint>()
      .x((d) => x(d.date) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.revenuePaise))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<DayPoint>()
      .x((d) => x(d.date) ?? 0)
      .y((d) => y(d.revenuePaise))
      .curve(d3.curveMonotoneX);

    const grad = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", `rev-${gid}`)
      .attr("x1", "0")
      .attr("x2", "0")
      .attr("y1", "0")
      .attr("y2", "1");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#35b3ef").attr("stop-opacity", 0.35);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#35b3ef").attr("stop-opacity", 0);

    const areaPath = g
      .append("path")
      .datum(series)
      .attr("fill", `url(#rev-${gid})`)
      .attr("d", area);

    const linePath = g
      .append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#35b3ef")
      .attr("stroke-width", 2)
      .attr("d", line);

    if (!reduced) {
      const len = (linePath.node() as SVGPathElement)?.getTotalLength?.() ?? 0;
      linePath
        .attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
      areaPath.attr("opacity", 0).transition().duration(500).attr("opacity", 1);
    }
  }, [series, gid, reduced]);

  return <svg ref={ref} className="h-auto w-full" role="img" aria-label="Revenue trend" />;
}

export function OrdersBarChart({ series }: { series: DayPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 640;
    const height = 180;
    const margin = { top: 12, right: 12, bottom: 28, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(series.map((d) => d.date))
      .range([0, innerW])
      .padding(0.25);

    const yMax = d3.max(series, (d) => d.orders) || 1;
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(series.filter((_, i) => i % Math.ceil(series.length / 6) === 0).map((d) => d.date))
          .tickFormat((d) => series.find((s) => s.date === d)?.label ?? String(d))
      )
      .call((sel) => sel.select(".domain").attr("stroke", "rgba(255,255,255,0.2)"))
      .call((sel) => sel.selectAll("text").attr("fill", "rgba(244,248,255,0.55)").attr("font-size", 10));

    g.append("g")
      .call(d3.axisLeft(y).ticks(4))
      .call((sel) => sel.select(".domain").attr("stroke", "rgba(255,255,255,0.2)"))
      .call((sel) => sel.selectAll("text").attr("fill", "rgba(244,248,255,0.55)").attr("font-size", 10));

    g.selectAll("rect")
      .data(series)
      .join("rect")
      .attr("x", (d) => x(d.date) ?? 0)
      .attr("width", x.bandwidth())
      .attr("fill", "#f4831f")
      .attr("rx", 3)
      .attr("y", reduced ? (d) => y(d.orders) : innerH)
      .attr("height", reduced ? (d) => innerH - y(d.orders) : 0)
      .transition()
      .duration(reduced ? 0 : 550)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => y(d.orders))
      .attr("height", (d) => innerH - y(d.orders));
  }, [series, reduced]);

  return <svg ref={ref} className="h-auto w-full" role="img" aria-label="Daily order volume" />;
}

export function TopProductsChart({ products }: { products: ProductPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    if (!products.length) return;

    const width = 640;
    const barH = 28;
    const height = products.length * (barH + 8) + 20;
    const margin = { top: 8, right: 72, bottom: 8, left: 120 };
    const innerW = width - margin.left - margin.right;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(products, (d) => d.revenuePaise) || 1])
      .nice()
      .range([0, innerW]);

    const y = d3
      .scaleBand()
      .domain(products.map((d) => d.name))
      .range([0, products.length * (barH + 8)])
      .padding(0.2);

    g.selectAll("text.label")
      .data(products)
      .join("text")
      .attr("class", "label")
      .attr("x", -8)
      .attr("y", (d) => (y(d.name) ?? 0) + (y.bandwidth() / 2))
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", "rgba(244,248,255,0.75)")
      .attr("font-size", 11)
      .text((d) => (d.name.length > 16 ? `${d.name.slice(0, 15)}…` : d.name));

    g.selectAll("rect")
      .data(products)
      .join("rect")
      .attr("y", (d) => y(d.name) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", "#35b3ef")
      .attr("x", 0)
      .attr("width", reduced ? (d) => x(d.revenuePaise) : 0)
      .transition()
      .duration(reduced ? 0 : 500)
      .attr("width", (d) => x(d.revenuePaise));

    g.selectAll("text.val")
      .data(products)
      .join("text")
      .attr("class", "val")
      .attr("x", (d) => x(d.revenuePaise) + 6)
      .attr("y", (d) => (y(d.name) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "rgba(244,248,255,0.7)")
      .attr("font-size", 10)
      .text((d) => formatInr(d.revenuePaise));
  }, [products, reduced]);

  return <svg ref={ref} className="h-auto w-full" role="img" aria-label="Top products by revenue" />;
}

export function BreakdownChart({ slices, title }: { slices: SlicePoint[]; title: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    if (!slices.length) return;

    const width = 280;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal<string>()
      .domain(slices.map((s) => s.key))
      .range(["#35b3ef", "#f4831f", "#1656c4", "#7dd3fc", "#fdba74", "#94a3b8"]);

    const pie = d3
      .pie<SlicePoint>()
      .value((d) => d.value)
      .sort(null);
    const arc = d3.arc<d3.PieArcDatum<SlicePoint>>().innerRadius(radius * 0.55).outerRadius(radius);

    g.selectAll("path")
      .data(pie(slices))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.key))
      .attr("stroke", "#08183c")
      .attr("stroke-width", 2);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "rgba(244,248,255,0.85)")
      .attr("font-size", 12)
      .text(title);
  }, [slices, title]);

  return (
    <div>
      <svg ref={ref} className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label={title} />
      <ul className="mt-2 space-y-1 text-xs text-foam/70">
        {slices.map((s) => (
          <li key={s.key} className="flex justify-between gap-3">
            <span className="capitalize">{s.label}</span>
            <span className="tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
