#!/bin/sh
echo "🚀 Iniciando aplicación unificada"
echo "📍 Puerto: 80"
echo "🏷️ Versión: ${VERSION:-latest}"

get_total_memory() {
    if [ ! -z "$TASK_MEMORY" ]; then
        echo "$TASK_MEMORY"
    else
        mem_total=$(cat /proc/meminfo 2>/dev/null | grep MemTotal | awk '{print $2}')
        echo ${mem_total:-512}
    fi
}

get_cpu_count() {
    if [ ! -z "$TASK_CPU" ]; then
        echo "scale=2; $TASK_CPU / 1024" | bc
    else
        nproc
    fi
}

TOTAL_MEMORY_MB=$(get_total_memory)
TOTAL_CPUS=$(get_cpu_count)
CPU_UNITS=${TASK_CPU:-1024}

if [ ! -z "$TASK_MEMORY" ]; then
    NODE_MEMORY=$((TOTAL_MEMORY_MB * 80 / 100))
    export NODE_OPTIONS="--max-old-space-size=$NODE_MEMORY"
fi

if [ ! -z "$TASK_CPU" ]; then
    if [ "$CPU_UNITS" -lt 1024 ]; then
        MONGO_POOL_SIZE=5
    else
        MONGO_POOL_SIZE=$(( CPU_UNITS / 256 ))
    fi
    export MONGODB_POOLSIZE=$MONGO_POOL_SIZE
    export MONGODB_MAX_POOL_SIZE=$MONGO_POOL_SIZE
fi

if [ ! -z "$TASK_CPU" ]; then
    if [ "$CPU_UNITS" -lt 1024 ]; then
        NODE_WORKERS=1
    else
        NODE_WORKERS=$(( CPU_UNITS / 1024 ))
    fi
    export NODE_CLUSTER_WORKERS=$NODE_WORKERS
fi

export NITRO_PORT=80
export HOST=0.0.0.0
export PORT=80

echo "🎬 Ejecutando aplicación..."
cd /app
exec node .output/server/index.mjs
