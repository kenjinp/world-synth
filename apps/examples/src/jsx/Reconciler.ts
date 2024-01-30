import ReactReconciler from "react-reconciler"

const rootHostContext = {}
const childHostContext = {}

const hostConfig: ReactReconciler.HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout
> = {
  now: Date.now,
  getRootHostContext: () => {},
  prepareForCommit: () => {},
  resetAfterCommit: () => {},
  getChildHostContext: () => {},
  shouldSetTextContent: () => {},
  /**
   This is where react-reconciler wants to create an instance of UI element in terms of the target. Since our target here is the DOM, we will create document.createElement and type is the argument that contains the type string like div or img or h1 etc. The initial values of domElement attributes can be set in this function from the newProps argument
   */
  createInstance(
    type,
    newProps,
    rootContainerInstance,
    _currentHostContext,
    workInProgress,
  ) {
    // const domElement = document.createElement(type);
    // Object.keys(newProps).forEach(propName => {
    //   const propValue = newProps[propName];
    //   if (propName === 'children') {
    //     if (typeof propValue === 'string' || typeof propValue === 'number') {
    //       domElement.textContent = propValue;
    //     }
    //   } else if (propName === 'onClick') {
    //     domElement.addEventListener('click', propValue);
    //   } else if (propName === 'className') {
    //     domElement.setAttribute('class', propValue);
    //   } else {
    //     const propValue = newProps[propName];
    //     domElement.setAttribute(propName, propValue);
    //   }
    // });
    // return domElement;
    console.log("createInstance ARGS", arguments)
    return new Image()
  },
  createTextInstance: () => {
    throw new Error("I don't support text nodes!")
  },
  appendInitialChild: () => {},
  finalizeInitialChildren: () => {},
  clearContainer: () => {},
  appendChildToContainer() {
    console.log("ARGS", arguments)
  },
  supportsMutation: true,
} as const

const ReactReconcilerInst = ReactReconciler(hostConfig)
export default {
  render(reactElement, domElement, callback) {
    console.log(arguments)
    // Create a root Container if it doesnt exist
    if (!domElement._rootContainer) {
      domElement._rootContainer = ReactReconcilerInst.createContainer(
        domElement,
        false,
      )
    }

    // update the root Container
    return ReactReconcilerInst.updateContainer(
      reactElement,
      domElement._rootContainer,
      null,
      callback,
    )
  },
}

declare global {
  // tslint:disable-next-line: no-namespace
  namespace JSX {
    // tslint:disable-next-line: interface-name
    interface IntrinsicElements {
      ["simplex-noise"]: any
    }
  }
}
