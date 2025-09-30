// 窗口大小自适应布局管理器
class AdaptiveLayout {
    constructor() {
        this.breakpoints = {
            small: { width: 400, height: 300 },
            medium: { width: 600, height: 400 },
            large: { width: 800, height: 600 }
        };
        this.currentSize = 'medium';
        this.init();
    }

    init() {
        this.setupResizeListener();
        this.adjustLayout();
    }

    setupResizeListener() {
        // 监听窗口大小变化
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                this.adjustLayout();
            });
            
            // 初始调整
            this.adjustLayout();
        }
    }

    getWindowSize() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth || 800,
            height: window.innerHeight || document.documentElement.clientHeight || 600
        };
    }

    adjustLayout() {
        const size = this.getWindowSize();
        let newSize = 'large';

        if (size.width <= this.breakpoints.small.width || 
            size.height <= this.breakpoints.small.height) {
            newSize = 'small';
        } else if (size.width <= this.breakpoints.medium.width || 
                   size.height <= this.breakpoints.medium.height) {
            newSize = 'medium';
        }

        if (newSize !== this.currentSize) {
            this.currentSize = newSize;
            this.applySizeClass(newSize);
            this.adjustFontSize(newSize);
            this.adjustSpacing(newSize);
        }
    }

    applySizeClass(size) {
        const container = document.querySelector('.container');
        if (container) {
            container.className = container.className.replace(/size-\w+/g, '');
            container.classList.add(`size-${size}`);
        }
    }

    adjustFontSize(size) {
        const fontSizes = {
            small: '10px',
            medium: '11px',
            large: '13px'
        };

        const elements = document.querySelectorAll('.thrift-tree-container, .field-name-input, .modifier-select, .naming-select, .field-type');
        elements.forEach(el => {
            if (el) el.style.fontSize = fontSizes[size];
        });
    }

    adjustSpacing(size) {
        const paddings = {
            small: { row: '4px 6px', container: '6px' },
            medium: { row: '6px 8px', container: '12px' },
            large: { row: '8px 12px', container: '16px' }
        };

        const padding = paddings[size];
        
        // 调整字段行间距
        const fieldRows = document.querySelectorAll('.field-row');
        fieldRows.forEach(row => {
            if (row) row.style.padding = padding.row;
        });

        // 调整容器间距
        const containers = document.querySelectorAll('.tree-content, .fields-container');
        containers.forEach(container => {
            if (container) container.style.padding = padding.container;
        });
    }

    // 计算合适的容器高度
    calculateContainerHeight() {
        const size = this.getWindowSize();
        const headerHeight = 60; // 面板头部高度
        const toolbarHeight = 40; // 工具栏高度
        const padding = 20; // 内边距
        
        return Math.max(200, size.height - headerHeight - toolbarHeight - padding);
    }

    // 动态调整树形编辑器容器
    adjustTreeContainer() {
        const treeContainer = document.querySelector('.thrift-tree-container');
        if (treeContainer) {
            const height = this.calculateContainerHeight();
            treeContainer.style.maxHeight = `${height}px`;
            treeContainer.style.minHeight = `${Math.min(200, height)}px`;
        }
    }

    // 隐藏或显示元素以适应小屏幕
    optimizeForSmallScreen() {
        const size = this.getWindowSize();
        
        if (size.width <= 500 || size.height <= 300) {
            // 小屏幕下简化界面
            this.simplifyInterface();
        } else {
            this.restoreInterface();
        }
    }

    simplifyInterface() {
        // 隐藏非关键元素
        const nonCriticalElements = document.querySelectorAll('.field-index, .struct-type');
        nonCriticalElements.forEach(el => {
            if (el) el.style.display = 'none';
        });

        // 简化下拉菜单
        const selects = document.querySelectorAll('.modifier-select, .naming-select');
        selects.forEach(select => {
            if (select) {
                select.style.minWidth = '50px';
                select.style.padding = '2px 4px';
            }
        });
    }

    restoreInterface() {
        const hiddenElements = document.querySelectorAll('.field-index, .struct-type');
        hiddenElements.forEach(el => {
            if (el) el.style.display = '';
        });

        const selects = document.querySelectorAll('.modifier-select, .naming-select');
        selects.forEach(select => {
            if (select) {
                select.style.minWidth = '';
                select.style.padding = '';
            }
        });
    }

    // 主动检测并修复溢出
    fixOverflow() {
        const containers = document.querySelectorAll('.tree-content, .thrift-tree-container');
        containers.forEach(container => {
            if (container) {
                container.style.overflow = 'auto';
                container.style.overflowX = 'hidden';
                container.style.boxSizing = 'border-box';
            }
        });

        // 确保body不溢出
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    // 强制重新计算布局
    forceReflow() {
        const container = document.querySelector('.thrift-tree-container');
        if (container) {
            container.style.display = 'none';
            container.offsetHeight; // 触发重排
            container.style.display = '';
        }
    }

    // 检测uTools环境并优化
    optimizeForUtools() {
        // uTools通常有固定尺寸，我们主动适配
        const size = this.getWindowSize();
        
        // 如果窗口很小，使用极简模式
        if (size.width <= 600 && size.height <= 400) {
            this.applyMinimalMode();
        }
        
        // 确保内容区域可见
        this.ensureVisibleArea();
    }

    applyMinimalMode() {
        document.body.classList.add('utools-minimal');
        
        // 进一步压缩空间
        const elements = document.querySelectorAll('.tree-toolbar');
        elements.forEach(el => {
            if (el) el.style.padding = '4px';
        });
        
        // 隐藏非关键元素
        const nonEssential = document.querySelectorAll('.field-index, .struct-type');
        nonEssential.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    ensureVisibleArea() {
        const containers = document.querySelectorAll('.tree-content');
        containers.forEach(container => {
            if (container) {
                const maxHeight = Math.max(150, window.innerHeight - 100);
                container.style.maxHeight = `${maxHeight}px`;
                container.style.height = `${maxHeight}px`;
            }
        });
    }
}

// 初始化自适应布局
let adaptiveLayout;

// 在DOM加载完成后初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adaptiveLayout = new AdaptiveLayout();
        
        // 延迟初始化以确保DOM完全加载
        setTimeout(() => {
            adaptiveLayout.adjustTreeContainer();
            adaptiveLayout.fixOverflow();
        }, 100);
    });
}

// 导出给全局使用
window.AdaptiveLayout = AdaptiveLayout;