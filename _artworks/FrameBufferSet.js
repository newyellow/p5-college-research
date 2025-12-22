class FrameBufferSet {
    constructor(_width = -1, _height = -1) {

        this.fboA = createFramebuffer();
        this.fboB = createFramebuffer();
        this.isA = false;

        this.from = null;
        this.to = null;

        this.swap(); // initialize from and to

        if(_width > 0 && _height > 0) {
            this.resize(_width, _height);
        }
    }

    resize(_width, _height) {
        this.fboA.resize(_width, _height);
        this.fboB.resize(_width, _height);
    }

    swap() {
        this.isA = !this.isA;

        if(this.isA) {
            this.from = this.fboB;
            this.to = this.fboA;
        }
        else {
            this.from = this.fboA;
            this.to = this.fboB;
        }
    }

    remove() {
        this.fboA.remove();
        this.fboB.remove();
    }
}